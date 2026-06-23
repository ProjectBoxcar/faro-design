import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { getProject, getSectionRow, getSections } from "@/lib/queries";
import { getSection, getPillarOf, getPhaseOf, readsOf } from "@/lib/methodology";
import { phaseProgress, nextSectionId, prevSectionId, type StatusMap } from "@/lib/flow";
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

  const phaseProg = phase ? phaseProgress(phase.id, statusMap) : { done: 0, total: 0 };
  const phasePercent = phaseProg.total === 0 ? 0 : Math.round((phaseProg.done / phaseProg.total) * 100);

  const prevId = prevSectionId(sectionKey);
  const nextId = nextSectionId(sectionKey);
  const prev = prevId ? getSection(prevId) : null;
  const nextSec = nextId ? getSection(nextId) : null;
  const nextGuide = nextId ? sectionGuide(nextId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-12 lg:py-12 2xl:max-w-[96rem]">
      <Link
        href={prevId ? `/projects/${id}/${encodeURIComponent(prevId)}` : `/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} />
        {prevId && prev ? `Back: ${prev.name}` : "Back to overview"}
      </Link>

      <header className="mb-6">
        <div className="text-xs uppercase tracking-wider text-[var(--subtle)]">
          {phase?.name} · {pillar?.name}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar done={phaseProg.done} total={phaseProg.total} className="max-w-[240px] flex-1" />
          <span className="shrink-0 text-xs text-[var(--subtle)]">{phasePercent}% of this phase</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight">{section.name}</h1>
          <StepKindBadge kind={section.kind} />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 2xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Working column — kept readable even on very wide screens */}
        <div className="min-w-0 2xl:max-w-4xl">
          {guide.whatItIs && (
            <p className="mb-6 max-w-2xl text-2xl font-normal leading-relaxed tracking-tight text-[var(--foreground)]">
              {guide.whatItIs}
            </p>
          )}

          {section.internal && (
            <p className="mb-5 rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--muted)]">
              Optional background step — it won&apos;t appear in the brief you hand to your designer.
            </p>
          )}

          <SectionEditor
            projectId={id}
            section={section}
            initialValue={(row?.value as Record<string, unknown>) ?? {}}
            initialStatus={row?.status ?? "empty"}
            aiGenerated={row?.ai_generated ?? false}
          />

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
            ) : (
              <span />
            )}
          </nav>
        </div>

        {/* Context rail */}
        <aside className="mt-8 space-y-4 lg:mt-0 lg:sticky lg:top-8 lg:self-start">
          {guide.whyItMatters && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--subtle)]">
                Why it matters
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{guide.whyItMatters}</p>
            </div>
          )}

          {reads.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--subtle)]">
                Builds on
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
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
                    {!filled.has(r.id) && " (empty)"}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {guide.takeaway && (
            <div className="rounded-xl border border-[var(--ok)]/30 bg-[var(--surface)] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--subtle)]">
                <CheckCircle2 size={13} className="text-[var(--ok)]" /> When you&apos;re done
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{guide.takeaway}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
