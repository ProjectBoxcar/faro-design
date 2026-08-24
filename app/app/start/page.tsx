"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FaroLoaderPanel } from "@/components/FaroLoader";
import { IllustrativeFigure } from "@/components/IllustrativeFigure";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";

type Answers = {
  offering: string;
  story: string;
  difference: string;
  operations: string;
  edge: string;
  taste: string;
};

const Q_KEYS = ["offering", "story", "difference", "operations", "edge", "taste"] as const;

const TOTAL_STEPS = Q_KEYS.length + 1;

export default function StartPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [greenfield, setGreenfield] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    offering: "",
    story: "",
    difference: "",
    operations: "",
    edge: "",
    taste: "",
  });
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDetails = step === 0;
  const questionIndex = step - 1;
  const isQuestion = questionIndex >= 0 && questionIndex < Q_KEYS.length;
  const isLastQuestion = questionIndex === Q_KEYS.length - 1;
  const qKey = isQuestion ? Q_KEYS[questionIndex] : null;
  const qn = questionIndex + 1;

  const currentAnswer = qKey ? answers[qKey].trim() : "";
  const canAdvance = isDetails
    ? name.trim().length > 0
    : isQuestion
      ? currentAnswer.length > 0
      : false;

  function next() {
    setError(null);
    if (isDetails && !name.trim()) {
      setError(t("start.needName"));
      return;
    }
    if (isQuestion && !currentAnswer) {
      setError(t("start.needAnswer"));
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function startBlank() {
    if (!name.trim()) {
      setError(t("start.needNameFirst"));
      return;
    }
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          client_name: client.trim() || null,
          greenfield,
          personal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        setError(data.error ?? t("common.error"));
        setBuilding(false);
        return;
      }
      router.push(`/projects/${data.id}`);
    } catch {
      setError(t("common.error"));
      setBuilding(false);
    }
  }

  async function build() {
    if (!currentAnswer) {
      setError(t("start.needAnswer"));
      return;
    }
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          client_name: client.trim() || null,
          greenfield,
          personal,
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.projectId) {
        setError(data.error ?? t("common.error"));
        setBuilding(false);
        return;
      }
      if (data.aiSkipped) {
        router.push(
          `/projects/${data.projectId}?aiSkipped=1${
            data.error ? `&msg=${encodeURIComponent(String(data.error).slice(0, 200))}` : ""
          }`
        );
        return;
      }
      if (data.error || (typeof data.filled === "number" && data.filled === 0 && res.status !== 201)) {
        const warn = encodeURIComponent(
          String(data.error ?? "Could not draft strategy from your answers. Your answers were saved.")
        );
        router.push(`/projects/${data.projectId}/express?intakeError=${warn}`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? t("common.error"));
        setBuilding(false);
        return;
      }
      router.push(`/projects/${data.projectId}/express`);
    } catch {
      setError(t("common.error"));
      setBuilding(false);
    }
  }

  if (building) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <FaroLoaderPanel
          beaconSize="hero"
          title={t("start.draftingTitle")}
          description={t("start.draftingDesc")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 lg:py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> {t("common.home")}
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="text-xs text-[var(--subtle)]">
            {t("start.stepOf", { n: step + 1, total: TOTAL_STEPS })}
          </div>
        </div>
      </div>

      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition ${
              i <= step ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]"
            }`}
          />
        ))}
      </div>

      <div className="flex-1">
        {isDetails && (
          <div>
            <IllustrativeFigure
              id="startInterview"
              size="full"
              className="mb-6 aspect-[16/10] w-full max-w-lg border border-[var(--border)]"
            />
            <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight">
              {t("start.title")}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("start.intro")}</p>

            <label className="mt-8 block text-sm font-medium">{t("start.brandName")}</label>
            <input
              autoFocus
              data-faro-anchor="faro-start-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
              placeholder={t("start.brandNamePh")}
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-3 text-lg outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
            <p className="mt-1.5 text-xs text-[var(--subtle)]">{t("start.brandNameHint")}</p>

            <label className="mt-5 block text-sm font-medium">{t("start.company")}</label>
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder={t("start.companyPh")}
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />

            <label className="mt-5 flex items-start gap-2.5 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={greenfield}
                onChange={(e) => setGreenfield(e.target.checked)}
                className="mt-0.5"
              />
              {t("start.greenfield")}
            </label>

            <label className="mt-3 flex items-start gap-2.5 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={personal}
                onChange={(e) => setPersonal(e.target.checked)}
                className="mt-0.5"
              />
              {t("start.personal")}
            </label>

            <button
              onClick={startBlank}
              className="mt-6 text-sm text-[var(--subtle)] underline-offset-2 transition hover:text-[var(--muted)] hover:underline"
            >
              {t("start.blank")}
            </button>
          </div>
        )}

        {isQuestion && qKey && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
              {t("start.questionOf", { n: qn, total: Q_KEYS.length })}
            </div>
            <h1 className="mt-1.5 font-serif text-2xl font-medium leading-tight tracking-tight lg:text-3xl">
              {t(`start.q${qn}Title`)}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{t(`start.q${qn}Help`)}</p>
            <textarea
              autoFocus
              value={answers[qKey]}
              onChange={(e) => setAnswers((a) => ({ ...a, [qKey]: e.target.value }))}
              placeholder={t(`start.q${qn}Ph`)}
              rows={7}
              className="mt-5 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-3 leading-relaxed outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
            <p className="mt-2 text-xs text-[var(--subtle)]">{t("start.typeHint")}</p>
          </div>
        )}
      </div>

      {error && <p className="mt-6 text-sm text-[var(--danger)]">{error}</p>}

      <div className="mt-10 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            onClick={back}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft size={15} /> {t("common.back")}
          </button>
        ) : (
          <span />
        )}

        {isLastQuestion ? (
          <button
            onClick={build}
            disabled={!canAdvance || building}
            data-faro-anchor="faro-start-finish"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("start.finish")} <Check size={16} />
          </button>
        ) : (
          <button
            onClick={next}
            disabled={!canAdvance}
            data-faro-anchor="faro-start-next"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDetails ? t("start.startBtn") : t("common.next")} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </main>
  );
}
