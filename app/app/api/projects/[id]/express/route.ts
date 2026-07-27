import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import {
  getProject,
  completeSectionsWithContent,
  publishProject,
  getSectionRow,
  saveSection,
} from "@/lib/queries";
import {
  expressStatus,
  startExpress,
  cancelExpress,
  refineStatus,
  startExpressRefine,
  cancelExpressRefine,
} from "@/lib/express";
import { maybeRunViabilityGate } from "@/lib/viability";
import { flowSteps } from "@/lib/flow";
import { getSection } from "@/lib/methodology";
import type { SectionValue } from "@/lib/db/types";

export const dynamic = "force-dynamic";

// Review cards + full-strategy detail the express page shows.
const REVIEW_SECTIONS = [
  "concept",
  "brief.central-pattern",
  "brief.main-tension",
  "brief.constraint",
  "brief.emotional-territory",
  "brief.must-resolve",
  "manifesto",
  "design-plan",
  "strategic-document.reality",
  "strategic-document.identity",
  "strategic-document.communication",
  "strategic-document.direction",
];

function sectionsDto(projectId: string) {
  const sections: Record<
    string,
    {
      id: string;
      name: string;
      value: Record<string, unknown> | null;
      fields: {
        id: string;
        label: string;
        type: string;
        columns: { id: string; label: string }[];
        options?: string[];
      }[];
    }
  > = {};
  for (const key of REVIEW_SECTIONS) {
    const section = getSection(key);
    if (!section) continue;
    const row = getSectionRow(projectId, key);
    sections[key] = {
      id: key,
      name: section.name,
      value: (row?.value as Record<string, unknown>) ?? null,
      fields: (section.fields ?? []).map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        columns: (f.columns ?? []).map((c) => ({ id: c.id, label: c.label })),
        options: f.options,
      })),
    };
  }
  return sections;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProject(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const includeSections = new URL(req.url).searchParams.get("sections") === "1";
  return NextResponse.json({
    state: expressStatus(id),
    refine: refineStatus(id),
    ...(includeSections ? { sections: sectionsDto(id) } : {}),
  });
}

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("ready"),
    sectionId: z.string().min(1),
    value: z.record(z.string(), z.unknown()),
  }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProject(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.action === "start") {
    if (!hasApiKey()) {
      return NextResponse.json(
        { error: "AI isn't configured yet — add your API key in Settings." },
        { status: 400 }
      );
    }
    return NextResponse.json({ state: startExpress(id), refine: refineStatus(id) });
  }

  if (parsed.data.action === "cancel") {
    const state = cancelExpress(id);
    const refine = cancelExpressRefine(id);
    return NextResponse.json({ state, refine });
  }

  if (parsed.data.action === "ready") {
    if (!getSection(parsed.data.sectionId)) {
      return NextResponse.json({ error: "Unknown section" }, { status: 400 });
    }
    if (!hasApiKey()) {
      // Still save the edit even without AI — no cascade rewrite.
      saveSection({
        projectId: id,
        key: parsed.data.sectionId,
        value: parsed.data.value as unknown as SectionValue,
        status: "draft",
        aiGenerated: false,
      });
      return NextResponse.json({
        refine: {
          status: "done",
          sourceId: parsed.data.sectionId,
          sourceName: getSection(parsed.data.sectionId)?.name ?? parsed.data.sectionId,
          done: 0,
          total: 0,
          current: null,
          currentName: null,
          error: null,
          updatedIds: [parsed.data.sectionId],
        },
        sections: sectionsDto(id),
        warning: "AI isn't configured — saved your edit but couldn't refresh dependent cards.",
      });
    }
    const refine = startExpressRefine(id, parsed.data.sectionId, parsed.data.value);
    return NextResponse.json({ refine, sections: sectionsDto(id) });
  }

  // Approve: the owner accepted the reviewed brief + design plan. Commit every
  // drafted step, publish the read-only brief, and make sure the viability
  // verdict is settled before the Studio opens.
  const state = expressStatus(id);
  if (state.status !== "done") {
    return NextResponse.json({ error: "The strategy draft isn't finished yet." }, { status: 409 });
  }
  const refine = refineStatus(id);
  if (refine.status === "running") {
    return NextResponse.json(
      { error: "Still updating strategy cards from your last edit — wait a moment." },
      { status: 409 }
    );
  }
  // Complete every methodology step that has content — including Reality inputs
  // filled at Quick Start so the journey shows Strategy → Handover complete.
  completeSectionsWithContent(id, flowSteps().map((s) => s.sectionId));
  const token = publishProject(id);
  await maybeRunViabilityGate(id).catch((e) => console.error("[viability] failed:", e));
  try {
    const { recordStrategyLearning } = await import("@/lib/brand-memory");
    recordStrategyLearning(id);
  } catch (e) {
    console.warn("[brand-memory] strategy learn failed:", e);
  }
  return NextResponse.json({ token });
}
