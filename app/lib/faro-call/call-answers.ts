import type { CallAgendaItem, FaroCallContext } from "@/lib/faro-call/types";

/** Normalize text for TTS / captions. */
export function sanitizeSpokenText(text: string): string {
  return text
    .trim()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#~>]+/g, "")
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stage(agenda: CallAgendaItem[], id: string): CallAgendaItem | undefined {
  return agenda.find((a) => a.id === id);
}

function isDone(agenda: CallAgendaItem[], id: string): boolean {
  return stage(agenda, id)?.status === "done";
}

/**
 * Fast, factual answers for common call questions — no AI round-trip.
 * Returns null when the question needs the LLM.
 */
export function tryAnswerCallQuestion(
  question: string,
  ctx: Pick<FaroCallContext, "projectName" | "agenda" | "beats">
): string | null {
  const q = question.toLowerCase().trim();
  if (q.length < 2) return null;

  const name = ctx.projectName;
  const current = ctx.agenda.find((a) => a.status === "current");
  const nextTodo = ctx.agenda.find((a) => a.status === "todo" || a.status === "current");
  const locked = ctx.agenda.filter((a) => a.status === "locked").map((a) => a.name);

  const asksLogo = /\b(logo|mark|wordmark)\b/.test(q);
  const asksName = /\b(name|spelling|title)\b/.test(q) && !asksLogo;
  const asksStrategy = /\b(strategy|concept|brief|manifesto)\b/.test(q);
  const asksDesign = /\b(design|identity|landing|deck|visual)\b/.test(q);
  const asksChannel = /\b(sms|email|ad|print|channel)\b/.test(q);
  const asksHandover = /\b(handover|package|download|share|deliverable)\b/.test(q);
  const asksContent = /\b(content|posts?|calendar|social)\b/.test(q);
  const asksLeft = /\b(left|next|remain|missing|todo|what's left|whats left|where am i|status|progress)\b/.test(
    q
  );
  const asksWhat = /\b(what (is|are)|show me|do we have|have we|is there)\b/.test(q);

  if (asksLeft || /where (are|am) we|how far/.test(q)) {
    const done = ctx.agenda.filter((a) => a.status === "done").map((a) => a.name);
    const parts: string[] = [];
    parts.push(
      current
        ? `Right now you're on ${current.name.replace(/^\d+\.\s*/, "")}: ${current.detail}.`
        : `For ${name}, check the agenda on the right for where you are.`
    );
    if (done.length) parts.push(`Already done: ${done.join(", ")}.`);
    if (locked.length) parts.push(`Still locked: ${locked.join(", ")}.`);
    if (nextTodo && nextTodo.status !== "current") {
      parts.push(`After this, ${nextTodo.name} is next.`);
    }
    return parts.join(" ");
  }

  if (asksLogo && (asksWhat || /approved|ready|have|got|show/.test(q))) {
    return isDone(ctx.agenda, "logo")
      ? `Yes — ${name} has an approved logo. You're looking at it on the shared screen when we hit the logo beat, or open Logo Workshop to change it.`
      : `Not yet. ${name} still needs a logo approved in Logo Workshop before Design Studio unlocks.`;
  }

  if (asksName && (asksWhat || /confirm|locked|have|got/.test(q))) {
    return isDone(ctx.agenda, "name")
      ? `Yes — the brand name for logos is locked as ${name}.`
      : `The name isn't confirmed yet. Open Brand name to keep “${name}” or pick another spelling.`;
  }

  if (asksStrategy && (asksWhat || /done|ready|have|approved/.test(q))) {
    return isDone(ctx.agenda, "strategy")
      ? `Strategy essentials for ${name} are ready. You can still open the optional full map later if you want more depth.`
      : `Strategy is still in progress for ${name}. Finish and approve the Express essentials first.`;
  }

  if (asksChannel && (asksWhat || /done|ready|need|required|have/.test(q))) {
    return isDone(ctx.agenda, "design")
      ? `Channel templates are part of the design package and should be finished with identity, landing, and deck.`
      : `SMS, email, ads, and print are required for Brand Handover. Build them in Design Studio from your strategy and approved identity.`;
  }

  if (asksDesign && (asksWhat || /done|ready|have|left/.test(q))) {
    const design = stage(ctx.agenda, "design");
    if (design?.status === "done") {
      return `Design Studio is complete for ${name}: identity, landing, deck, and channels are final.`;
    }
    if (design?.status === "locked") {
      return `Design Studio is still locked. Approve a logo first, then we build the identity and applications.`;
    }
    return `Design Studio is open: ${design?.detail ?? "build identity, then landing, deck, and channels"}.`;
  }

  if (asksHandover && (asksWhat || /ready|can i|download|share/.test(q))) {
    return isDone(ctx.agenda, "handover")
      ? `Yes — the Brand Handover package for ${name} is ready. Open Brand Handover to download or share the client link.`
      : `Not yet. Finish Design Studio finals — identity, landing, deck, and the four channel templates — then Handover unlocks.`;
  }

  if (asksContent && (asksWhat || /ready|unlock|have|open/.test(q))) {
    return isDone(ctx.agenda, "content")
      ? `Content Studio already has a month of posts ready to review.`
      : isDone(ctx.agenda, "handover")
        ? `The package is ready, so Content Studio should be unlocked. Open it to generate a month of posts from your photos.`
        : `Content Studio unlocks only after the full Brand Handover package is complete.`;
  }

  return null;
}
