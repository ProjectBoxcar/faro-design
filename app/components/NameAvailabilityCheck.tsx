"use client";

import { useState } from "react";
import { Globe, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { EvalScore } from "@/lib/db/types";

export type NameCheck = {
  id: string;
  subject: string | null;
  verdict: "pass" | "caveat" | "fail" | "blocked" | null;
  scores: EvalScore[] | null;
  createdAt: string;
};

const VERDICT_STYLE: Record<string, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  pass: { label: "Looks usable", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ShieldCheck },
  caveat: { label: "Usable with caveats", className: "bg-amber-50 text-amber-700 border-amber-200", Icon: ShieldQuestion },
  fail: { label: "Serious conflicts", className: "bg-red-50 text-red-700 border-red-200", Icon: ShieldAlert },
};

const RESULT_STYLE: Record<string, string> = {
  Pass: "text-emerald-700",
  "Pass with caveat": "text-amber-700",
  Fail: "text-red-700",
};

export function NameAvailabilityCheck({
  projectId,
  suggestedNames,
  initialChecks,
}: {
  projectId: string;
  suggestedNames: string[];
  initialChecks: NameCheck[];
}) {
  const [checks, setChecks] = useState<NameCheck[]>(initialChecks);
  const [name, setName] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(initialChecks[0]?.id ?? null);

  async function run(candidate: string) {
    const trimmed = candidate.trim();
    if (!trimmed || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/naming-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.check) {
        setError(data?.error ?? "The availability check failed — try again.");
      } else {
        setChecks((prev) => [data.check, ...prev]);
        setOpenId(data.check.id);
        setName("");
      }
    } catch {
      setError("The availability check failed — try again.");
    }
    setRunning(false);
  }

  return (
    <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <Globe size={15} className="text-[var(--muted)]" />
        <h2 className="text-sm font-semibold">Live availability check</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Checks the name against real-world usage: domain registrations (verified live), and web research into
        trademarks, same-sector companies and social handles.
      </p>

      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(name);
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name to check…"
          disabled={running}
          className="min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
        />
        <button
          type="submit"
          disabled={running || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          {running ? "Checking…" : "Check availability"}
        </button>
      </form>

      {suggestedNames.length > 0 && !running && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[var(--subtle)]">Candidates on file:</span>
          {suggestedNames.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setName(n)}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {running && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Running live domain lookups and web research — this usually takes a minute or two.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {checks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {checks.map((check) => {
            const style = VERDICT_STYLE[check.verdict ?? ""] ?? VERDICT_STYLE.caveat;
            const summary = check.scores?.find((s) => s.key === "summary");
            const rows = check.scores?.filter((s) => s.key !== "summary") ?? [];
            const open = openId === check.id;
            return (
              <li key={check.id} className="rounded-lg border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : check.id)}
                  className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
                >
                  <span className="text-sm font-medium">{check.subject}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${style.className}`}
                  >
                    <style.Icon size={12} /> {style.label}
                  </span>
                  <span className="ml-auto text-xs text-[var(--subtle)]">
                    {new Date(check.createdAt).toLocaleDateString()}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-[var(--border)] px-3 py-3">
                    {summary?.notes && (
                      <p className="mb-3 text-sm leading-relaxed text-[var(--foreground)]">{summary.notes}</p>
                    )}
                    <table className="w-full text-sm">
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.key} className="border-t border-[var(--border)] align-top first:border-t-0">
                            <td className="w-[38%] py-1.5 pr-3 text-[var(--muted)]">{row.label}</td>
                            <td
                              className={`w-[18%] py-1.5 pr-3 font-medium ${RESULT_STYLE[row.result] ?? "text-[var(--muted)]"}`}
                            >
                              {row.result}
                            </td>
                            <td className="py-1.5 text-[var(--muted)]">{row.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-[var(--subtle)]">
        Automated screen based on live lookups and web research — not legal advice. Before committing to a name,
        confirm trademark clearance with an attorney in the markets where you&apos;ll register.
      </p>
    </section>
  );
}
