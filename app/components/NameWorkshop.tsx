"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { FaroBeacon } from "@/components/FaroLoader";
import { StagePageBanner } from "@/components/StagePageBanner";

export type NameCandidateDto = {
  name: string;
  why: string;
  style: string;
};

export function NameWorkshop({
  projectId,
  workingName,
  initialCandidates,
  isGenericWorkingTitle = true,
}: {
  projectId: string;
  workingName: string;
  initialCandidates: NameCandidateDto[];
  /** When false, copy treats the Start name as a real candidate to confirm, not a placeholder. */
  isGenericWorkingTitle?: boolean;
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [busy, setBusy] = useState<"propose" | "pick" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  async function propose() {
    setBusy("propose");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/naming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "propose" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't suggest names");
      setCandidates((data.candidates as NameCandidateDto[]) ?? []);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't suggest names");
    } finally {
      setBusy(null);
    }
  }

  async function pick(name: string) {
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Enter a name with at least two characters.");
      return;
    }
    setBusy("pick");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/naming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pick", name: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save the name");
      router.push(`/projects/${projectId}/studio`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the name");
      setBusy(null);
    }
  }

  async function skip() {
    setBusy("skip");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/naming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't continue");
      router.push(`/projects/${projectId}/studio`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't continue");
      setBusy(null);
    }
  }

  const locked = busy !== null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 lg:px-8 lg:py-14">
      <StagePageBanner stageId="name">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
          After strategy · before logos
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">Brand name</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {isGenericWorkingTitle ? (
            <>
              You started with <strong className="text-[var(--foreground)]">“{workingName}”</strong>,
              which still looks like a temporary label. Logos will lock the spelling — pick a stronger
              name now, or keep this one for now.
            </>
          ) : (
            <>
              You started with <strong className="text-[var(--foreground)]">“{workingName}”</strong>.
              Confirm it for logos, type a different name, or ask for strategy-based suggestions. One
              click is enough — logos use whatever you lock here.
            </>
          )}
        </p>
      </StagePageBanner>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
          <FaroBeacon size="md" className="shrink-0" />
          <div className="mt-4 min-w-0 sm:mt-0">
            <p className="font-medium text-[var(--foreground)]">Suggest names from your strategy</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Uses your concept, tension, and personality — and the same Claude key as strategy
              drafting (not the logo key).
            </p>
            <button
              type="button"
              onClick={() => void propose()}
              disabled={locked}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {busy === "propose" ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Suggesting…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  {candidates.length ? "Suggest more names" : "Suggest names"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {candidates.length > 0 && (
        <ul className="mt-8 space-y-3">
          {candidates.map((c) => {
            const active = selected === c.name;
            return (
              <li key={c.name}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setSelected(c.name)}
                  className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-xl font-medium tracking-tight">{c.name}</p>
                      {c.style ? (
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                          {c.style}
                        </p>
                      ) : null}
                      {c.why ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">{c.why}</p>
                      ) : null}
                    </div>
                    {active ? (
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                        <Check size={14} />
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <label className="block text-sm font-medium">Or type your own</label>
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setSelected(null);
          }}
          placeholder="Your brand name"
          disabled={locked}
          className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] disabled:opacity-50"
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void skip()}
          disabled={locked}
          className="text-sm text-[var(--subtle)] underline-offset-2 transition hover:text-[var(--muted)] hover:underline disabled:opacity-50"
        >
          {busy === "skip" ? "Continuing…" : `Keep “${workingName}” for logos`}
        </button>
        <button
          type="button"
          disabled={locked || (!selected && custom.trim().length < 2)}
          onClick={() => void pick(selected ?? custom)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "pick" ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              Use this name &amp; open Logo Workshop <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--subtle)]">
        <Link href={`/projects/${projectId}/express`} className="underline-offset-2 hover:underline">
          Back to strategy review
        </Link>
      </p>
    </div>
  );
}
