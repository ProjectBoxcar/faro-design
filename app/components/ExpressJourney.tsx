"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Loader2, Pencil, Sparkles } from "lucide-react";

// One value block of a strategy section, already reduced to plain JSON.
export type ExpressSection = {
  id: string;
  name: string;
  value: Record<string, unknown> | null;
  fields: { id: string; label: string; type: string; columns: { id: string; label: string }[] }[];
};

export type ExpressStateDto = {
  status: "idle" | "running" | "done" | "failed";
  done: number;
  total: number;
  current: string | null;
  currentName: string | null;
  error: string | null;
};

const PIPELINE_STAGES = [
  { label: "Reality — what your business actually is", prefix: ["reality."] },
  { label: "Identity — who the brand is", prefix: ["identity."] },
  { label: "Communication — how it speaks", prefix: ["communication."] },
  { label: "Strategic document & brief", prefix: ["strategic-document.", "brief."] },
  { label: "Brand concept & manifesto", prefix: ["concept", "insights", "manifesto"] },
  { label: "Design plan", prefix: ["audit", "design-plan"] },
];

function stageIndexOf(sectionId: string | null): number {
  if (!sectionId) return -1;
  return PIPELINE_STAGES.findIndex((s) => s.prefix.some((p) => sectionId === p || sectionId.startsWith(p)));
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

// Generic renderer for a section value: strings as paragraphs, lists as
// bullets, tables as tables — driven by the methodology field definitions.
function ValueBlock({ section, compactFields }: { section: ExpressSection; compactFields?: string[] }) {
  if (!section.value) return null;
  const fields = compactFields
    ? section.fields.filter((f) => compactFields.includes(f.id))
    : section.fields;
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const v = section.value?.[f.id];
        if (isEmptyValue(v)) return null;
        return (
          <div key={f.id}>
            {fields.length > 1 && (
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                {f.label}
              </div>
            )}
            {typeof v === "string" && <p className="whitespace-pre-wrap text-sm leading-relaxed">{v}</p>}
            {Array.isArray(v) && f.type === "list" && (
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {(v as string[]).map((item, i) => (
                  <li key={i}>{String(item)}</li>
                ))}
              </ul>
            )}
            {Array.isArray(v) && f.type === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--subtle)]">
                      {f.columns.map((c) => (
                        <th key={c.id} className="py-1.5 pr-4 font-semibold">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(v as Record<string, unknown>[]).map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0 align-top">
                        {f.columns.map((c) => (
                          <td key={c.id} className="py-2 pr-4 leading-relaxed">{String(row?.[c.id] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Card({
  title,
  projectId,
  sectionId,
  children,
}: {
  title: string;
  projectId: string;
  sectionId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-medium tracking-tight">{title}</h3>
        <Link
          href={`/projects/${projectId}/${sectionId}`}
          className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)]"
        >
          <Pencil size={12} /> Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

export function ExpressJourney({
  projectId,
  projectName,
  initialState,
  sections,
  approved,
}: {
  projectId: string;
  projectName: string;
  initialState: ExpressStateDto;
  sections: Record<string, ExpressSection>;
  approved: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<ExpressStateDto>(initialState);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = state.status === "running" || state.status === "idle";

  // While the pipeline runs, poll for progress; refresh the page data once done.
  useEffect(() => {
    if (state.status === "done" || state.status === "failed") return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/express`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.state) {
          setState(data.state);
          if (data.state.status === "done") {
            router.refresh();
            return;
          }
          if (data.state.status === "idle" && data.state.done < data.state.total) {
            // A restart lost the in-memory run — resume it.
            void fetch(`/api/projects/${projectId}/express`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "start" }),
            });
          }
        }
      } catch {
        // transient; keep polling
      }
      if (!cancelled) timer = window.setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [projectId, router, state.status]);

  async function approve() {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      router.push(`/projects/${projectId}/design`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
      setApproving(false);
    }
  }

  if (running || state.status === "failed") {
    const activeStage = stageIndexOf(state.current);
    const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
        <div className="text-center">
          <Sparkles className="mx-auto animate-pulse text-[var(--accent)]" size={32} />
          <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">
            Drafting the {projectName} strategy
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your answers are becoming a complete brand strategy and design plan. This takes a few
            minutes — you&apos;ll review everything on one page when it&apos;s ready.
          </p>
        </div>
        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ol className="mt-8 space-y-3">
          {PIPELINE_STAGES.map((stage, i) => {
            const stageDone = activeStage > i;
            const active = activeStage === i;
            return (
              <li key={stage.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    stageDone
                      ? "bg-[var(--accent)] text-white"
                      : active
                      ? "border border-[var(--accent)] text-[var(--accent)]"
                      : "border border-[var(--border-strong)] text-[var(--subtle)]"
                  }`}
                >
                  {stageDone ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : i + 1}
                </span>
                <span className={active ? "font-medium" : stageDone ? "" : "text-[var(--muted)]"}>
                  {stage.label}
                  {active && state.currentName ? (
                    <span className="text-[var(--subtle)]"> — {state.currentName}…</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        {state.status === "failed" && (
          <div className="mt-8 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-5 py-4 text-sm">
            <p>{state.error ?? "Strategy drafting failed."}</p>
            <button
              onClick={async () => {
                setState({ ...state, status: "running", error: null });
                await fetch(`/api/projects/${projectId}/express`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "start" }),
                });
              }}
              className="mt-2 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Resume drafting
            </button>
          </div>
        )}
      </main>
    );
  }

  const concept = sections["concept"];
  const briefIds = [
    "brief.central-pattern",
    "brief.main-tension",
    "brief.constraint",
    "brief.emotional-territory",
    "brief.must-resolve",
  ];
  const designPlan = sections["design-plan"];
  const manifesto = sections["manifesto"];
  const detailIds = [
    "strategic-document.reality",
    "strategic-document.identity",
    "strategic-document.communication",
    "strategic-document.direction",
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Your strategy is ready to review
        </div>
        <h1 className="mt-2 font-serif text-4xl font-medium leading-tight tracking-tight lg:text-5xl">
          {projectName} — strategy &amp; design plan
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          This is the heart of your brand. Read it, fix anything that&apos;s off with Edit, then
          approve to open the Design Studio, where these decisions become your visual brand.
        </p>
      </header>

      <div className="space-y-5">
        {concept?.value && (
          <section className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                Brand concept
              </div>
              <Link
                href={`/projects/${projectId}/concept`}
                className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)]"
              >
                <Pencil size={12} /> Edit
              </Link>
            </div>
            <h2 className="font-serif text-2xl font-medium tracking-tight">
              {String(concept.value["statement"] ?? "")}
            </h2>
            {typeof concept.value["description"] === "string" && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{concept.value["description"]}</p>
            )}
          </section>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {briefIds.map((id) => {
            const s = sections[id];
            if (!s?.value) return null;
            return (
              <Card key={id} title={s.name} projectId={projectId} sectionId={id}>
                <ValueBlock section={s} />
              </Card>
            );
          })}
        </div>

        {manifesto?.value && (
          <Card title="Manifesto" projectId={projectId} sectionId="manifesto">
            <ValueBlock section={manifesto} compactFields={["text"]} />
          </Card>
        )}

        {designPlan?.value && (
          <Card title="Design plan — what the Studio will create" projectId={projectId} sectionId="design-plan">
            <ValueBlock
              section={designPlan}
              compactFields={["visual-identity", "verbal-identity", "deliverables", "execution-order"]}
            />
          </Card>
        )}

        <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 text-sm font-medium">
            Full strategy detail (Reality · Identity · Communication · Direction)
            <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-6 border-t border-[var(--border)] p-5">
            {detailIds.map((id) => {
              const s = sections[id];
              if (!s?.value) return null;
              return (
                <div key={id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-serif text-lg font-medium tracking-tight">{s.name}</h3>
                    <Link
                      href={`/projects/${projectId}/${id}`}
                      className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)]"
                    >
                      <Pencil size={12} /> Edit
                    </Link>
                  </div>
                  <ValueBlock section={s} />
                </div>
              );
            })}
            <p className="text-xs text-[var(--subtle)]">
              Want to go deeper? Every underlying step stays editable in the{" "}
              <Link href={`/projects/${projectId}`} className="underline underline-offset-2">
                full workspace
              </Link>
              .
            </p>
          </div>
        </details>
      </div>

      {error && <p className="mt-6 text-sm text-[var(--danger)]">{error}</p>}

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Link href={`/projects/${projectId}`} className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]">
          Open the full workspace instead
        </Link>
        <button
          onClick={approve}
          disabled={approving}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {approving ? <Loader2 size={15} className="animate-spin" /> : approved ? <Check size={15} /> : null}
          {approved ? "Re-approve & open the Design Studio" : "Approve & open the Design Studio"}
          <ArrowRight size={15} />
        </button>
      </div>
    </main>
  );
}
