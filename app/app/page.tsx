import Link from "next/link";
import { Settings } from "lucide-react";
import { listProjects, getSections } from "@/lib/queries";
import { NewProjectButton } from "@/components/NewProjectButton";
import { ProjectList } from "@/components/ProjectList";
import { overview } from "@/lib/guide";
import { methodology, getSection } from "@/lib/methodology";
import { flowSteps, type StatusMap } from "@/lib/flow";
import { hasApprovedLogo, studioBlockedReason } from "@/lib/studio";
import type { JourneyStep } from "@/components/JourneyProgress";

export const dynamic = "force-dynamic";

const PHASE_SHORT: Record<string, string> = {
  strategic: "Strategy",
  handoff: "Brief",
  planning: "Plan",
  design: "Design",
};

function isFilled(status: string | undefined): boolean {
  return status === "draft" || status === "complete" || status === "client_submitted";
}

function isComplete(status: string | undefined): boolean {
  return status === "complete";
}

export default function Home() {
  const projects = listProjects();
  // Journey points = methodology phases (same arc the app walks). Progress counts
  // required sections only; Design has no required steps and only unlocks after.
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
    // Strategy is "done" when required sections are filled or the owner has
    // already moved on (logo workshop / publish / design phase). Optional
    // Reality steps (packages, channels) never block this.
    const strategyJourneyDone =
      Boolean(p.published_at) ||
      p.current_phase === "design" ||
      p.current_phase === "finished" ||
      logoWorkshopReady ||
      logoApproved ||
      (strategyIds.length > 0 && strategyFilled >= strategyIds.length);
    const expressReady = isFilled(designPlan) && !strategyJourneyDone;
    const designJourneyDone =
      p.current_phase === "finished" ||
      (Boolean(p.published_at) && logoApproved);

    const steps: JourneyStep[] = methodology.phases.map((phase) => {
      const ids = requiredByPhase.get(phase.id) ?? [];
      // Design phase is optional artifact work — show as a destination point.
      if (phase.id === "design") {
        return {
          id: phase.id,
          label: phase.name,
          short: PHASE_SHORT[phase.id] ?? phase.name,
          done: designJourneyDone ? 1 : 0,
          total: 1,
        };
      }
      const filled = ids.filter((id) => isFilled(map.get(id))).length;
      return {
        id: phase.id,
        label: phase.name,
        short: PHASE_SHORT[phase.id] ?? phase.name,
        // Force full fill when the strategy journey has been completed in practice.
        done: strategyJourneyDone ? ids.length : filled,
        total: ids.length,
      };
    });

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
    };
  });
  const ov = overview();

  const PARTS = [
    { name: "Reality", text: "The plain facts: what you sell, who it's for, and what makes you different." },
    { name: "Identity", text: "How you see yourself: your story, what you believe, and where you're headed." },
    { name: "Communication", text: "How your brand should sound and behave, and the promise it makes." },
  ];
  const STEPS = [
    "Answer a handful of plain questions about your business.",
    "The app drafts your whole strategy from your answers.",
    "Review each piece, then hand a clear brief to your designer.",
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-12 lg:py-14 2xl:max-w-[110rem]">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl font-medium leading-[1.02] tracking-tight lg:text-7xl">
            {ov.title}
          </h1>
          <p className="mt-4 max-w-3xl font-serif text-2xl font-normal leading-snug tracking-tight text-[var(--foreground)] lg:text-3xl">
            {ov.tagline}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <Settings size={17} />
          </Link>
          <NewProjectButton />
        </div>
      </header>

      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow lg:p-8">
        <p className="max-w-3xl text-base leading-relaxed text-[var(--muted)]">{ov.summary}</p>

        <h2 className="mt-7 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-medium text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-7 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          What goes into your brand
        </h2>
        <p className="mb-3 mt-1 max-w-3xl text-sm text-[var(--muted)]">
          A brand is more than a logo. You&apos;ll work through the four things it&apos;s built on — the app drafts each
          from your answers, and you just review:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PARTS.map((part) => (
            <div key={part.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold">{part.name}</div>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{part.text}</p>
            </div>
          ))}
        </div>
      </section>

      {cards.length === 0 ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
              Your projects
            </h2>
          </div>
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
            <p className="text-[var(--muted)]">No projects yet.</p>
            <p className="mt-1 text-sm text-[var(--subtle)]">
              Create your first brand engagement to start the Strategic phase.
            </p>
          </div>
        </>
      ) : (
        <ProjectList projects={cards} />
      )}
    </main>
  );
}
