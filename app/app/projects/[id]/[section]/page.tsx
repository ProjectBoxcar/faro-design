import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { getProject, getSectionRow, getSections, listEvaluations } from "@/lib/queries";
import { getSection, getPillarOf, getPhaseOf, readsOf, canGenerate } from "@/lib/methodology";
import { phaseProgress, nextSectionId, prevSectionId, type StatusMap } from "@/lib/flow";
import { sectionGuide } from "@/lib/guide";
import { suggestedCandidates } from "@/lib/naming-check";
import { SectionEditor } from "@/components/SectionEditor";
import { NameAvailabilityCheck, type NameCheck } from "@/components/NameAvailabilityCheck";
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

  // Derived (synthesis/partial) steps shouldn't greet the owner with a blank
  // form after we promised "just review". Auto-draft from upstream when:
  //  - it's a Reality/Identity foundation step with at least one upstream answer
  //    on file (drafting from literally nothing is banned server-side too), or
  //  - its declared inputs are all filled (e.g. once the customer survey exists).
  // Otherwise it's genuinely waiting on later inputs — say so honestly.
  const isSynthesis = section.kind === "synthesis" || section.kind === "partial";
  const sectionEmpty = !row?.value || Object.keys(row.value as Record<string, unknown>).length === 0;
  const inFoundation = pillar?.id === "reality" || pillar?.id === "identity";
  const autoDraft =
    isSynthesis &&
    sectionEmpty &&
    ((inFoundation && reads.some((r) => filled.has(r.id))) || canGenerate(sectionKey, filled));
  const awaitingInputs = isSynthesis && sectionEmpty && !autoDraft;
  const missingReads = awaitingInputs ? reads.filter((r) => !filled.has(r.id)) : [];

  const phaseProg = phase ? phaseProgress(phase.id, statusMap) : { done: 0, total: 0 };
  const phasePercent = phaseProg.total === 0 ? 0 : Math.round((phaseProg.done / phaseProg.total) * 100);

  // The Technical Verification review gets a live availability panel: real
  // domain lookups + web research into trademarks and same-sector collisions.
  const showAvailability = sectionKey === "naming.technical-verification";
  const namingChecks: NameCheck[] = showAvailability
    ? listEvaluations(id, "naming").map((e) => ({
        id: e.id,
        subject: e.subject,
        verdict: e.verdict,
        scores: e.scores,
        createdAt: e.created_at.toISOString(),
      }))
    : [];
  const candidateNames = showAvailability ? suggestedCandidates(id) : [];

  const prevId = prevSectionId(sectionKey);
  const nextId = nextSectionId(sectionKey);
  const prev = prevId ? getSection(prevId) : null;
  const nextSec = nextId ? getSection(nextId) : null;
  const nextGuide = nextId ? sectionGuide(nextId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 lg:px-5 lg:py-5">
      <Link
        href={prevId ? `/projects/${id}/${encodeURIComponent(prevId)}` : `/projects/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} />
        {prevId && prev ? `Back: ${prev.name}` : "Back to overview"}
      </Link>

      <header className="mb-5">
        <div className="text-xs uppercase tracking-wider text-[var(--subtle)]">
          {phase?.name} · {pillar?.name}
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <ProgressBar done={phaseProg.done} total={phaseProg.total} className="max-w-[240px] flex-1" />
          <span className="shrink-0 text-xs text-[var(--subtle)]">{phasePercent}% of this phase</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <h1 className="font-serif text-xl font-medium leading-[1.05] tracking-tight lg:text-2xl">{section.name}</h1>
          <StepKindBadge kind={section.kind} />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-8">
        {/* Working column — kept readable even on very wide screens */}
        <div className="min-w-0 2xl:max-w-4xl">
          {guide.whatItIs && (
            <p className="mb-5 max-w-2xl text-sm font-normal leading-relaxed tracking-tight text-[var(--foreground)]">
              {guide.whatItIs}
            </p>
          )}

          {section.internal && (
            <p className="mb-5 rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--muted)]">
              Optional background step — it won&apos;t appear in the brief you hand to your designer.
            </p>
          )}

          {awaitingInputs && (
            <div className="mb-5 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
              We&apos;ll write this step for you too — it just builds on things that come a little later
              {missingReads.length > 0 && (
                <>
                  , like{" "}
                  <span className="text-[var(--foreground)]">{missingReads.map((r) => r.name).join(", ")}</span>
                </>
              )}
              . Once those are filled in, open this step again and it drafts itself. You can also write it yourself now
              if you&apos;d rather.
            </div>
          )}

          {showAvailability && (
            <NameAvailabilityCheck
              projectId={id}
              suggestedNames={candidateNames}
              initialChecks={namingChecks}
            />
          )}

          <SectionEditor
            projectId={id}
            section={section}
            initialValue={(row?.value as Record<string, unknown>) ?? {}}
            initialStatus={row?.status ?? "empty"}
            aiGenerated={row?.ai_generated ?? false}
            autoDraft={autoDraft}
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
                className="card-shadow max-w-[60%] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-right transition hover:bg-[var(--surface-2)]"
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
