"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";

type Answers = {
  offering: string;
  story: string;
  difference: string;
  operations: string;
  edge: string;
};

const QUESTIONS: {
  key: keyof Answers;
  title: string;
  help: string;
  placeholder: string;
}[] = [
  {
    key: "offering",
    title: "What do you sell, and who is it for?",
    help: "Describe what you actually offer and the kind of client who gets the most out of it. Don't worry about polish — just tell it plainly.",
    placeholder: "We help independent architecture studios… Our best clients are…",
  },
  {
    key: "story",
    title: "How did it start, and where are you taking it?",
    help: "How the business began, anything that shaped how you work, and where you'd like it to be in a few years.",
    placeholder: "I started this after… What I learned was… In a few years I want…",
  },
  {
    key: "difference",
    title: "What makes you different — and what do you believe about your industry?",
    help: "What clients get from you that they can't get elsewhere, and any convictions you hold about how your field should work.",
    placeholder: "Unlike most studios we… I believe our industry gets ___ wrong because…",
  },
  {
    key: "operations",
    title: "How does the business run, and where does it show up?",
    help: "How many products/services you offer, your price level (premium, mid-range, budget), where the brand appears (website, Instagram, packaging, storefront…), and how customers find you.",
    placeholder: "Three services, premium-priced. The brand lives on our website, Instagram and packaging. Most clients come from referrals…",
  },
  {
    key: "edge",
    title: "What's one thing that's true about you a competitor couldn't honestly say?",
    help: "The hardest-to-copy thing — a standard you hold, a way you work, something only you could claim.",
    placeholder: "We've never shipped a brand we didn't believe in…",
  },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // intro details + questions

export default function StartPage() {
  const router = useRouter();
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
  });
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDetails = step === 0;
  const questionIndex = step - 1; // 0..QUESTIONS.length-1 while in questions
  const isQuestion = questionIndex >= 0 && questionIndex < QUESTIONS.length;
  const isLastQuestion = questionIndex === QUESTIONS.length - 1;

  const canAdvance = isDetails ? name.trim().length > 0 : true;

  function next() {
    setError(null);
    if (isDetails && !name.trim()) {
      setError("Give your brand a name to continue.");
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  // Escape hatch: skip the interview and open an empty workspace to fill by hand.
  async function startBlank() {
    if (!name.trim()) {
      setError("Give your brand a name first.");
      return;
    }
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), client_name: client.trim() || null, greenfield, personal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        setError(data.error ?? "Couldn't create the project.");
        setBuilding(false);
        return;
      }
      router.push(`/projects/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setBuilding(false);
    }
  }

  async function build() {
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
      if (!res.ok || !data.projectId) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setBuilding(false);
        return;
      }
      // Land in the workspace; drafts are pre-filled and ready to review.
      router.push(`/projects/${data.projectId}?drafted=1`);
    } catch {
      setError("Network error. Please try again.");
      setBuilding(false);
    }
  }

  if (building) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="animate-pulse">
          <Sparkles className="mx-auto text-[var(--accent)]" size={36} />
        </div>
        <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight">Drafting your strategy…</h1>
        <p className="mt-3 max-w-md text-[var(--muted)]">
          We&apos;re turning your answers into a first draft of your brand&apos;s foundations. This takes about a
          minute. Next, we&apos;ll walk you through your draft one step at a time.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10 lg:py-16">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> Home
        </Link>
        <div className="text-xs text-[var(--subtle)]">
          Step {step + 1} of {TOTAL_STEPS}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-10 flex gap-1.5">
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
            <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight">Let&apos;s build your brand</h1>
            <p className="mt-3 text-[var(--muted)]">
              Here&apos;s how it works, in two parts. <strong className="text-[var(--foreground)]">First</strong>, you
              answer a few quick questions about your brand — that&apos;s the part you&apos;re doing now.{" "}
              <strong className="text-[var(--foreground)]">Then</strong>, we draft your whole strategy and walk you
              through it step by step, so you can read each piece and fix anything that&apos;s off. No branding
              experience needed.
            </p>

            <label className="mt-8 block text-sm font-medium">Brand name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
              placeholder="e.g. Finisterra"
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-3 text-lg outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />

            <label className="mt-5 block text-sm font-medium">Company / your name (optional)</label>
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Who this brand belongs to"
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />

            <label className="mt-5 flex items-start gap-2.5 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={greenfield}
                onChange={(e) => setGreenfield(e.target.checked)}
                className="mt-0.5"
              />
              This is a brand-new brand with no existing logo or materials yet.
            </label>

            <label className="mt-3 flex items-start gap-2.5 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={personal}
                onChange={(e) => setPersonal(e.target.checked)}
                className="mt-0.5"
              />
              This is my own project — no paying client behind it (yet).
            </label>

            <button
              onClick={startBlank}
              className="mt-6 text-sm text-[var(--subtle)] underline-offset-2 transition hover:text-[var(--muted)] hover:underline"
            >
              Prefer to fill everything in yourself? Start a blank project.
            </button>
          </div>
        )}

        {isQuestion && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
              Question {questionIndex + 1} of {QUESTIONS.length}
            </div>
            <h1 className="mt-2 font-serif text-3xl font-medium leading-tight tracking-tight lg:text-4xl">
              {QUESTIONS[questionIndex].title}
            </h1>
            <p className="mt-3 text-[var(--muted)]">{QUESTIONS[questionIndex].help}</p>
            <textarea
              autoFocus
              value={answers[QUESTIONS[questionIndex].key]}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [QUESTIONS[questionIndex].key]: e.target.value }))
              }
              placeholder={QUESTIONS[questionIndex].placeholder}
              rows={7}
              className="mt-5 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-3 leading-relaxed outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
            <p className="mt-2 text-xs text-[var(--subtle)]">
              A few sentences is plenty. You can leave it blank if it doesn&apos;t apply.
            </p>
          </div>
        )}

      </div>

      {error && <p className="mt-6 text-sm text-[var(--danger)]">{error}</p>}

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            onClick={back}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <span />
        )}

        {isLastQuestion ? (
          <button
            onClick={build}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Finish &amp; create my draft <Check size={16} />
          </button>
        ) : (
          <button
            onClick={next}
            disabled={!canAdvance}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isDetails ? "Start" : "Next"} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </main>
  );
}
