import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { getProject, getSectionRow, getSections } from "@/lib/queries";
import { getSection, getPillarOf, getPhaseOf, readsOf, canGenerate } from "@/lib/methodology";
import {
  phaseProgress,
  nextSectionId,
  prevSectionId,
  sectionLock,
  type StatusMap,
} from "@/lib/flow";
import { sectionGuide } from "@/lib/guide";
import { SectionEditor } from "@/components/SectionEditor";
import { StepKindBadge } from "@/components/StepKindBadge";
import { ProgressBar } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section: sectionParam } = await params;
  const sectionKey = decodeURIComponent(sectionParam);
  const project = getProject(id);
  const section = getSection(sectionKey);
  if (!project || !section) notFound();

  const pillar = getPillarOf(sectionKey);
  const phase = getPhaseOf(sectionKey);
  const row = getSectionRow(id, sectionKey);
  const guide = sectionGuide(sectionKey);

  const statusMap: StatusMap = new Map(getSections(id).map((r) => [r.section_key, r.status]));
  const filled = new Set([...statusMap].filter(([, s]) => s !== "empty").map(([k]) => k));

  const reads = readsOf(sectionKey);
  const missingReads = reads.filter((r) => !filled.has(r.id));
  const generatable = canGenerate(sectionKey, filled);

  const phaseProg = phase ? phaseProgress(phase.id, statusMap) : { done: 0, total: 0 };
  const phasePercent = phaseProg.total === 0 ? 0 : Math.round((phaseProg.done / phaseProg.total) * 100);

  const prevId = prevSectionId(sectionKey);
  const nextId = nextSectionId(sectionKey);
  const prev = prevId ? getSection(prevId) : null;
  const nextSec = nextId ? getSection(nextId) : null;
  const nextGuide = nextId ? sectionGuide(nextId) : null;
  const nextLock = nextId ? sectionLock(nextId, statusMap) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 lg:px-10 lg:py-14">
      <Link
        href={prevId ? `/projects/${id}/${encodeURIComponent(prevId)}` : `/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} />
        {prevId && prev ? `Back: ${prev.name}` : "Back to overview"}
      </Link>

      <header className="mb-5">
        <div className="text-xs uppercase tracking-wider text-[var(--subtle)]">
          {phase?.name} · {pillar?.name}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar done={phaseProg.done} total={phaseProg.total} className="max-w-[240px] flex-1" />
          <span className="shrink-0 text-xs text-[var(--subtle)]">{phasePercent}% of this phase</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{section.name}</h1>
          <StepKindBadge kind={section.kind} />
        </div>
      </header>

      {/* The lead — read this first. Big and dark. */}
      {guide.whatItIs && (
        <p className="mb-4 text-[22px] font-medium leading-snug tracking-tight text-[var(--foreground)]">
          {guide.whatItIs}
        </p>
      )}

      {/* Why it matters — a small, quiet footnote. */}
      {guide.whyItMatters && (
        <p className="mb-6 text-[13px] leading-relaxed text-[var(--subtle)]">
          <span className="font-semibold uppercase tracking-wide">Why it matters · </span>
          {guide.whyItMatters}
        </p>
      )}

      {section.internal && (
        <p className="mb-5 rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--muted)]">
          Optional background step — it won&apos;t appear in the brief you hand to your designer.
        </p>
      )}

      {reads.length > 0 && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
          <div className="font-medium text-[var(--muted)]">Builds on earlier steps</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {reads.map((r) => (
              <Link
                key={r.id}
                href={`/projects/${id}/${encodeURIComponent(r.id)}`}
                className={
                  filled.has(r.id)
                    ? "rounded-full border border-[var(--ok)] px-2 py-0.5 text-xs text-[var(--ok)]"
                    : "rounded-full border border-dashed border-[var(--border-strong)] px-2 py-0.5 text-xs text-[var(--subtle)]"
                }
              >
                {r.name}
                {!filled.has(r.id) && " (still empty)"}
              </Link>
            ))}
          </div>
        </div>
      )}

      <SectionEditor
        projectId={id}
        section={section}
        initialValue={(row?.value as Record<string, unknown>) ?? {}}
        initialStatus={row?.status ?? "empty"}
        aiGenerated={row?.ai_generated ?? false}
        generatable={generatable}
        missingReads={missingReads.map((r) => r.name)}
      />

      {/* Takeaway — small quiet footnote, matches "why it matters". */}
      {guide.takeaway && (
        <p className="mt-6 flex gap-1.5 text-[13px] leading-relaxed text-[var(--subtle)]">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--ok)]" />
          <span>
            <span className="font-semibold uppercase tracking-wide">When you&apos;re done · </span>
            {guide.takeaway}
          </span>
        </p>
      )}

      {/* Back / Next */}
      <nav className="mt-8 flex items-stretch justify-between gap-3 border-t border-[var(--border)] pt-5">
        {prev && prevId ? (
          <Link
            href={`/projects/${id}/${encodeURIComponent(prevId)}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft size={15} /> {prev.name}
          </Link>
        ) : (
          <span />
        )}

        {nextSec && nextId ? (
          nextLock?.locked ? (
            <div className="max-w-[60%] rounded-lg border border-[var(--border)] px-3 py-2 text-right text-sm">
              <div className="text-[10px] uppercase tracking-wide text-[var(--subtle)]">Next</div>
              <div className="flex items-center justify-end gap-1 text-[var(--muted)]">
                <Lock size={13} /> {nextSec.name}
              </div>
              <div className="text-xs text-[var(--subtle)]">{nextLock.reason}</div>
            </div>
          ) : (
            <Link
              href={`/projects/${id}/${encodeURIComponent(nextId)}`}
              className="card-shadow max-w-[60%] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-right transition hover:bg-[var(--surface-2)]"
            >
              <div className="text-[10px] uppercase tracking-wide text-[var(--subtle)]">Next step</div>
              <div className="flex items-center justify-end gap-1.5 text-sm font-medium">
                {nextSec.name} <ArrowRight size={15} />
              </div>
              {nextGuide?.whatItIs && (
                <div className="truncate text-xs text-[var(--subtle)]">{nextGuide.whatItIs}</div>
              )}
            </Link>
          )
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
