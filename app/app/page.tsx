import Link from "next/link";
import { readFile } from "fs/promises";
import path from "path";
import { Check } from "lucide-react";
import { listProjects, getSections } from "@/lib/queries";
import { NewProjectButton } from "@/components/NewProjectButton";
import { ProjectList } from "@/components/ProjectList";
import { methodology, getSection } from "@/lib/methodology";
import { flowSteps, type StatusMap } from "@/lib/flow";
import { hasApprovedLogo, studioBlockedReason } from "@/lib/studio";
import type { JourneyStep } from "@/components/JourneyProgress";
import { primaryActionFromJourney, buildProjectJourney } from "@/lib/sidebar-journey";
import { getAiLaneHealthSnapshot } from "@/lib/settings";
import { isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import { SetupReadinessBanner } from "@/components/SetupReadinessBanner";
import { HomeHeroActions, HomeNav } from "@/components/HomeChrome";

export const dynamic = "force-dynamic";

async function loadBrandCopy(): Promise<{
  headline: string;
  lede: string;
}> {
  try {
    const raw = await readFile(path.join(process.cwd(), "public", "brand", "copy.json"), "utf8");
    const data = JSON.parse(raw) as {
      hero?: { headline?: string; lede?: string };
    };
    return {
      headline: data.hero?.headline?.trim() || "A brand you can actually explain.",
      lede:
        data.hero?.lede?.trim() ||
        "Turn what makes your business special into a clear direction — and a package a designer can build on.",
    };
  } catch {
    return {
      headline: "A brand you can actually explain.",
      lede: "Turn what makes your business special into a clear direction — and a package a designer can build on.",
    };
  }
}

function isFilled(status: string | undefined): boolean {
  return status === "draft" || status === "complete" || status === "client_submitted";
}

function isComplete(status: string | undefined): boolean {
  return status === "complete";
}

export default async function Home() {
  const brandCopy = await loadBrandCopy();
  let daemonUp: boolean | null = null;
  try {
    daemonUp = await isOpenDesignDaemonUp();
  } catch {
    daemonUp = false;
  }
  const setup = getAiLaneHealthSnapshot(daemonUp);
  const projects = listProjects();
  const requiredByPhase = new Map<string, string[]>();
  for (const step of flowSteps()) {
    const section = getSection(step.sectionId);
    if (!section || section.optional) continue;
    const list = requiredByPhase.get(step.phaseId) ?? [];
    list.push(step.sectionId);
    requiredByPhase.set(step.phaseId, list);
  }

  const cards = projects.map((p) => {
    const map: StatusMap = new Map(getSections(p.id).map((r) => [r.section_key, r.status]));
    const strategyIds = [...requiredByPhase.entries()]
      .filter(([phaseId]) => phaseId !== "design")
      .flatMap(([, ids]) => ids);
    const strategyFilled = strategyIds.filter((id) => isFilled(map.get(id))).length;
    const strategyComplete = strategyIds.filter((id) => isComplete(map.get(id))).length;
    const designPlan = map.get("design-plan");
    const logoWorkshopReady = !studioBlockedReason(p.id, "logo");
    const logoApproved = hasApprovedLogo(p.id);
    const strategyJourneyDone =
      Boolean(p.published_at) ||
      p.current_phase === "planning" ||
      p.current_phase === "design" ||
      p.current_phase === "finished" ||
      logoWorkshopReady ||
      logoApproved ||
      (strategyIds.length > 0 && strategyFilled >= strategyIds.length);
    const expressReady = isFilled(designPlan) && !strategyJourneyDone;

    // Align card progress with the six-stage project rail
    const journey = buildProjectJourney(p.id);
    const primary = primaryActionFromJourney(p.id);
    const steps: JourneyStep[] = journey.stages.map((s) => ({
      id: s.id,
      label: s.name.replace(/^\d+\.\s*/, ""),
      short: s.name.replace(/^\d+\.\s*/, "").split(" ")[0] || s.id,
      done: s.status === "done" ? 1 : 0,
      total: 1,
    }));

    return {
      id: p.id,
      name: p.name,
      clientName: p.client_name ?? null,
      status: p.status,
      phase: p.current_phase,
      steps,
      strategyFilled,
      strategyTotal: strategyIds.length,
      strategyComplete,
      published: Boolean(p.published_at),
      expressReady,
      logoWorkshopReady,
      logoApproved,
      continueHref: primary?.href ?? `/projects/${p.id}`,
      continueLabel: primary?.name ?? "Open project",
      journeyDone: journey.overall.done,
      journeyTotal: journey.overall.total,
    };
  });

  const PARTS = [
    {
      name: "Reality",
      text: "The plain facts: what you sell, who it's for, and what makes you different.",
    },
    {
      name: "Identity",
      text: "How you see yourself: your story, what you believe, and where you're headed.",
    },
    {
      name: "Communication",
      text: "How your brand should sound and behave, and the promise it makes.",
    },
    {
      name: "Design package",
      text: "Logo, visual system, landing page, and deck — ready for handover.",
    },
  ];

  const STEPS = [
    {
      title: "Answer plainly",
      text: "A handful of questions about your business — no jargon required.",
    },
    {
      title: "Strategy first",
      text: "The app drafts a full brand strategy you can review and edit.",
    },
    {
      title: "Assets that follow",
      text: "Logo, system, and mockups built from that direction — then a clean handover.",
    },
  ];

  return (
    <main className="min-h-full">
      <HomeNav />
      <HomeHeroActions
        headline={brandCopy.headline}
        lede={brandCopy.lede}
        showProjects={cards.length > 0}
      />

      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-12 2xl:max-w-[110rem]" id="projects">
        <SetupReadinessBanner lanes={setup.lanes} daemonUp={daemonUp} />
      </div>

      {/* How it works */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-12 lg:py-16 2xl:max-w-[110rem]">
          <p className="faro-kicker">How it works</p>
          <h2 className="font-serif mt-2 max-w-[18ch] text-3xl font-normal leading-none tracking-tight sm:text-4xl lg:text-5xl">
            From unsure to a direction you can see.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] p-6 transition hover:shadow-[var(--shadow-pop)]"
              >
                <div className="faro-accent-line mb-4" />
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="font-serif text-xl font-normal">{step.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-[var(--muted)]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What goes in */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-12 lg:py-16 2xl:max-w-[110rem]">
          <p className="faro-kicker">The whole package</p>
          <h2 className="font-serif mt-2 max-w-[16ch] text-3xl font-normal leading-none tracking-tight sm:text-4xl">
            A brand, not a file.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
            You&apos;ll work through what a real brand is built on. The app drafts each piece from your
            answers — you review, edit, and approve.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {PARTS.map((part) => (
              <div
                key={part.name}
                className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <div>
                  <div className="text-sm font-semibold">{part.name}</div>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{part.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects workspace */}
      <section id="projects" className="mx-auto max-w-7xl px-5 py-14 lg:px-12 lg:py-16 2xl:max-w-[110rem]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="faro-kicker">Workspace</p>
            <h2 className="font-serif mt-1 text-3xl font-normal tracking-tight sm:text-4xl">
              Your projects
            </h2>
          </div>
          <NewProjectButton />
        </div>

        {cards.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
            <p className="font-medium text-[var(--foreground)]">No projects yet.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Start your first brand project—strategy first, then the assets.
            </p>
            <div className="mt-5 flex justify-center">
              <NewProjectButton />
            </div>
          </div>
        ) : (
          <ProjectList projects={cards} />
        )}
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-[var(--subtle)] lg:px-12 2xl:max-w-[110rem]">
          <span className="font-serif text-sm tracking-wide text-[var(--muted)]">Faro Design</span>
          <span>Strategy first. Then the assets.</span>
        </div>
      </footer>
    </main>
  );
}
