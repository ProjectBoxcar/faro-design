"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, Sparkles, Trash2, Undo2 } from "lucide-react";
import type { AssetPayload, EvalScore } from "@/lib/db/types";

export type WorkspaceAsset = {
  id: string;
  label: string;
  direction: string | null;
  status: "candidate" | "chosen" | "approved" | "discarded";
  payload: AssetPayload;
  approvedAt: string | null;
  verdict: "pass" | "caveat" | "fail" | "blocked" | null;
  scores: EvalScore[];
};

// The logo workspace: generate → review survivors → choose → APPROVE.
// The Approve button is the whole point of this screen — the one act the AI
// can never perform. Until it's pressed, nothing here is part of the brand.
export function StudioLogoWorkspace({
  projectId,
  initialBlocked,
  name,
  initialAssets,
}: {
  projectId: string;
  initialBlocked: string | null;
  name: string | null;
  initialAssets: WorkspaceAsset[];
}) {
  const [assets, setAssets] = useState<WorkspaceAsset[]>(initialAssets);
  const [busy, setBusy] = useState<string | null>(null); // action id or "generate"
  const [error, setError] = useState<string | null>(null);
  const [lastDiscarded, setLastDiscarded] = useState(0);

  const live = assets.filter((a) => a.status !== "discarded");
  const discarded = assets.filter((a) => a.status === "discarded");
  const approved = live.find((a) => a.status === "approved");

  // Google Fonts used by any candidate's lettering — loaded live for preview.
  const fontLinks = useMemo(() => {
    const fonts = new Set<string>();
    for (const a of assets) {
      for (const f of ((a.payload.tokens?.fonts as string[]) ?? [])) fonts.add(f);
    }
    return [...fonts].map(
      (f) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`
    );
  }, [assets]);

  async function act(body: Record<string, string>, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      if (typeof data.discarded === "number") setLastDiscarded(data.discarded);
      const ws = data.workspace;
      setAssets(
        ws.assets.map((a: Record<string, unknown>) => ({
          id: a.id,
          label: a.label,
          direction: a.direction,
          status: a.status,
          payload: a.payload ?? {},
          approvedAt: a.approved_at ?? null,
          verdict: (a.evaluation as Record<string, unknown> | null)?.verdict ?? null,
          scores: ((a.evaluation as Record<string, unknown> | null)?.scores as EvalScore[]) ?? [],
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (initialBlocked) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        {initialBlocked}
      </div>
    );
  }

  return (
    <div>
      {fontLinks.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Logo — “{name}”</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
            Candidates below survived a skeptical AI critic; weak ones were discarded before you saw
            them. Pick the direction that feels right —{" "}
            <strong className="text-[var(--foreground)]">only your approval makes it real</strong>.
          </p>
        </div>
        <button
          onClick={() => act({ action: "generate" }, "generate")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy === "generate" ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Designing… takes a minute or two
            </>
          ) : (
            <>
              <Sparkles size={15} /> {live.length ? "Generate more candidates" : "Generate 3 candidates"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {lastDiscarded > 0 && (
        <p className="mb-6 text-xs text-[var(--subtle)]">
          The critic discarded {lastDiscarded} candidate{lastDiscarded === 1 ? "" : "s"} that didn&apos;t
          hold up — you only see the survivors.
        </p>
      )}

      {live.length === 0 && !busy && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No candidates yet. Generate the first three — each is designed from your strategy, scored
          against it, and shown with its critique.
        </div>
      )}

      {busy === "generate" && <GenerationProgress />}

      <div className="space-y-6">
        {live.map((a) => (
          <CandidateCard
            key={a.id}
            asset={a}
            name={name ?? ""}
            busy={busy}
            hasApproved={Boolean(approved)}
            onChoose={() => act({ action: "choose", assetId: a.id }, a.id)}
            onApprove={() => act({ action: "approve", assetId: a.id }, a.id)}
            onRevoke={() => act({ action: "revoke-approval", assetId: a.id }, a.id)}
            onVariations={() => act({ action: "variations", assetId: a.id }, "generate")}
            onDiscard={() => act({ action: "discard", assetId: a.id }, a.id)}
          />
        ))}
      </div>

      {discarded.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xs text-[var(--subtle)]">
            Discarded ({discarded.length}) — failed the critic or dismissed by you
          </summary>
          <div className="mt-3 flex flex-wrap gap-4 opacity-50">
            {discarded.map((a) => (
              <div key={a.id} className="w-40">
                <div
                  className="rounded-lg border border-[var(--border)] bg-white p-3 [&_svg]:h-10 [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: a.payload.svg ?? "" }}
                />
                <p className="mt-1 text-xs text-[var(--subtle)]">{a.label}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// The 2-minute generation wait, narrated: skeleton cards plus honest stage text.
function GenerationProgress() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const stage =
    elapsed < 10
      ? "Reading your strategy…"
      : elapsed < 80
        ? "Designing candidates from your concept, territory and palette…"
        : "The skeptical critic is scoring them against your strategy…";
  return (
    <div className="mb-6 space-y-6">
      <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 size={15} className="animate-spin" /> {stage}
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 h-5 w-44 rounded bg-[var(--surface-2)]" />
          <div className="mb-4 h-3 w-3/4 rounded bg-[var(--surface-2)]" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
            <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
            <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// The mark dropped into real surfaces — a decision aid, not decoration.
function ContextStrip({ svg, svgDark, name }: { svg: string; svgDark: string; name: string }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
        In context
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-white p-3">
          <div className="flex items-end">
            <div className="flex max-w-full items-center gap-1.5 rounded-t-md border border-b-0 border-[#D8D2C4] bg-[#EFEAE0] px-2.5 py-1.5">
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <span className="truncate text-[10px] text-[#555]">{name}</span>
              <span className="text-[10px] text-[#AAA]">×</span>
            </div>
          </div>
          <div className="rounded-b-md border border-[#D8D2C4] bg-white px-2.5 py-1 text-[9px] text-[#999]">
            {name.toLowerCase().replace(/\s+/g, "")}.com
          </div>
          <p className="mt-2 text-[10px] text-[var(--subtle)]">Browser tab · favicon at 16 px</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-white p-3">
          <div className="w-32 rounded-2xl bg-[#0E1B2A] px-3 pb-5 pt-2">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/20" />
            <div
              className="flex justify-center [&_svg]:h-5 [&_svg]:w-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svgDark }}
            />
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 rounded bg-white/10" />
              <div className="h-1.5 w-4/5 rounded bg-white/10" />
              <div className="h-1.5 w-3/5 rounded bg-white/10" />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--subtle)]">App header · dark</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white p-3">
          <div className="flex aspect-[7/4] w-full max-w-[180px] flex-col justify-between rounded-lg border border-[#E2DCCE] bg-[#F5F1E8] p-3 shadow-sm">
            <div
              className="[&_svg]:h-6 [&_svg]:w-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="space-y-1">
              <div className="h-1 w-16 rounded bg-[#0E1B2A]/30" />
              <div className="h-1 w-10 rounded bg-[#0E1B2A]/20" />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--subtle)]">Business card</p>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  asset,
  name,
  busy,
  hasApproved,
  onChoose,
  onApprove,
  onRevoke,
  onVariations,
  onDiscard,
}: {
  asset: WorkspaceAsset;
  name: string;
  busy: string | null;
  hasApproved: boolean;
  onChoose: () => void;
  onApprove: () => void;
  onRevoke: () => void;
  onVariations: () => void;
  onDiscard: () => void;
}) {
  const [showScores, setShowScores] = useState(false);
  const isBusy = busy === asset.id;
  const svg = asset.payload.svg ?? "";
  const svgDark = asset.payload.svgOnDark ?? svg;
  const critique = asset.scores.find((s) => s.key === "summary")?.notes;

  const chip =
    asset.status === "approved"
      ? "border-[var(--ok)]/50 text-[var(--ok)]"
      : asset.verdict === "pass"
        ? "border-[var(--ok)]/50 text-[var(--ok)]"
        : "border-[var(--border-strong)] text-[var(--muted)]";

  return (
    <div
      className={`rounded-2xl border bg-[var(--surface)] p-6 ${
        asset.status === "approved"
          ? "border-[var(--ok)]/60"
          : asset.status === "chosen"
            ? "border-[var(--accent)]/60"
            : "border-[var(--border)]"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-lg font-semibold tracking-tight">{asset.label}</h2>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${chip}`}>
            {asset.status === "approved" ? "approved" : (asset.verdict ?? "unscored")}
          </span>
          {asset.status === "chosen" && (
            <span className="rounded-full border border-[var(--accent)]/50 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              your pick
            </span>
          )}
        </div>
        {asset.status !== "approved" && (
          <button
            onClick={onDiscard}
            disabled={isBusy}
            title="Discard this candidate"
            className="text-[var(--subtle)] transition hover:text-[var(--danger)]"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {asset.direction && <p className="mb-2 max-w-3xl text-sm text-[var(--muted)]">{asset.direction}</p>}
      {critique && (
        <p className="mb-4 max-w-3xl text-sm italic text-[var(--subtle)]">Critic: “{critique}”</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="flex items-center justify-center rounded-xl border border-[var(--border)] p-6 [&_svg]:max-h-20 [&_svg]:w-full"
          style={{ background: "#F5F1E8" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div
          className="flex items-center justify-center rounded-xl p-6 [&_svg]:max-h-20 [&_svg]:w-full"
          style={{ background: "#0E1B2A" }}
          dangerouslySetInnerHTML={{ __html: svgDark }}
        />
        <div
          className="flex items-center justify-center rounded-xl border border-[var(--border)] p-6 [&_svg]:h-5 [&_svg]:w-auto [&_svg]:max-w-full"
          style={{ background: "#FFFFFF" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {(asset.status === "chosen" || asset.status === "approved") && (
        <ContextStrip svg={svg} svgDark={svgDark} name={name} />
      )}

      {asset.scores.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowScores(!showScores)}
            className="text-xs text-[var(--subtle)] underline-offset-2 hover:underline"
          >
            {showScores ? "Hide critique" : "Show the critic's scores"}
          </button>
          {showScores && (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {asset.scores.map((s) => (
                  <tr key={s.key} className="border-t border-[var(--border)]">
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{s.label}</td>
                    <td
                      className={`py-1.5 pr-3 font-medium ${
                        s.result === "pass"
                          ? "text-[var(--ok)]"
                          : s.result === "fail"
                            ? "text-[var(--danger)]"
                            : "text-[var(--muted)]"
                      }`}
                    >
                      {s.result}
                    </td>
                    <td className="py-1.5 text-[var(--subtle)]">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {asset.status === "candidate" && (
          <>
            <button
              onClick={onChoose}
              disabled={isBusy || busy === "generate"}
              className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
            >
              Choose this direction
            </button>
            {/* Approval is always visible so the human gate is never a surprise —
                just disabled until this candidate is the chosen direction. */}
            <button
              disabled
              title="Choose this direction first — then you can approve it"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white opacity-35"
            >
              <BadgeCheck size={16} /> Approve
            </button>
            <span className="text-xs text-[var(--subtle)]">← choose first, then approve</span>
          </>
        )}
        {asset.status === "chosen" && (
          <>
            <button
              onClick={onApprove}
              disabled={isBusy || busy === "generate"}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <BadgeCheck size={16} /> Approve — make it official
            </button>
            <button
              onClick={onVariations}
              disabled={isBusy || busy === "generate"}
              className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Not quite — give me variations
            </button>
          </>
        )}
        {asset.status === "approved" && (
          <>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ok)]">
              <BadgeCheck size={16} /> Approved by you
              {asset.approvedAt ? ` · ${new Date(asset.approvedAt).toLocaleDateString()}` : ""} — this is
              your logo
            </p>
            <button
              onClick={onRevoke}
              disabled={isBusy}
              className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] underline-offset-2 transition hover:underline"
            >
              <Undo2 size={12} /> Revoke approval
            </button>
          </>
        )}
        {hasApproved && asset.status === "candidate" && (
          <p className="text-xs text-[var(--subtle)]">
            You already approved a logo — approving another replaces it as the choice.
          </p>
        )}
        {isBusy && <Loader2 size={15} className="animate-spin text-[var(--subtle)]" />}
      </div>
    </div>
  );
}
