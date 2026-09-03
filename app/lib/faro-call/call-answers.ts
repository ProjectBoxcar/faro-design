import type { CallAgendaItem, CallStageId, FaroCallContext } from "@/lib/faro-call/types";

export type CallQuickAnswer = {
  text: string;
  /** When set, Shell jumps the shared stage to match the answer */
  jumpStageId?: CallStageId;
};

/** Normalize text for TTS / captions. */
export function sanitizeSpokenText(text: string): string {
  return text
    .trim()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[*_`#~>]+/g, "")
    .replace(/\{[^}]+\}/g, " ")
    // Strip most emoji / symbol pictographs
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stage(agenda: CallAgendaItem[], id: string): CallAgendaItem | undefined {
  return agenda.find((a) => a.id === id);
}

function isDone(agenda: CallAgendaItem[], id: string): boolean {
  return stage(agenda, id)?.status === "done";
}

function answerEn(
  q: string,
  ctx: Pick<FaroCallContext, "projectName" | "agenda" | "beats">
): CallQuickAnswer | null {
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
  const bareStatus = /^(logo|package|handover|content|name)\??$/.test(q);

  if (asksLeft || /where (are|am) we|how far/.test(q)) {
    const done = ctx.agenda.filter((a) => a.status === "done").map((a) => a.name);
    const parts: string[] = [];
    parts.push(
      current
        ? `Right now you're on ${current.name.replace(/^\d+\.\s*/, "")}: ${current.detail}.`
        : `For ${name}, check the agenda for where you are.`
    );
    if (done.length) parts.push(`Already done: ${done.join(", ")}.`);
    if (locked.length) parts.push(`Still locked: ${locked.join(", ")}.`);
    if (nextTodo && nextTodo.status !== "current") {
      parts.push(`After this, ${nextTodo.name} is next.`);
    }
    return { text: parts.join(" "), jumpStageId: current?.id as CallStageId | undefined };
  }

  if (asksLogo && (asksWhat || bareStatus || /approved|ready|have|got|show/.test(q))) {
    return {
      text: isDone(ctx.agenda, "logo")
        ? `Yes — ${name} has an approved logo. You're looking at it on the shared screen when we hit the logo beat, or open Logo Workshop to change it.`
        : `Not yet. ${name} still needs a logo approved in Logo Workshop before Design Studio unlocks.`,
      jumpStageId: "logo",
    };
  }

  if (asksName && (asksWhat || bareStatus || /confirm|locked|have|got/.test(q))) {
    return {
      text: isDone(ctx.agenda, "name")
        ? `Yes — the brand name for logos is locked as ${name}.`
        : `The name isn't confirmed yet. Open Brand name to keep "${name}" or pick another spelling.`,
      jumpStageId: "name",
    };
  }

  if (asksStrategy && (asksWhat || /done|ready|have|approved/.test(q))) {
    return {
      text: isDone(ctx.agenda, "strategy")
        ? `Strategy essentials for ${name} are ready. You can still open the optional full map later if you want more depth.`
        : `Strategy is still in progress for ${name}. Finish and approve the Express essentials first.`,
      jumpStageId: "strategy",
    };
  }

  if (asksChannel && (asksWhat || /done|ready|need|required|have/.test(q))) {
    return {
      text: isDone(ctx.agenda, "design")
        ? `Channel templates are part of the design package and should be finished with identity, landing, and deck.`
        : `SMS, email, ads, and print are required for Brand Handover. Build them in Design Studio from your strategy and approved identity.`,
      jumpStageId: "design",
    };
  }

  if (asksDesign && (asksWhat || /done|ready|have|left/.test(q))) {
    const design = stage(ctx.agenda, "design");
    let text: string;
    if (design?.status === "done") {
      text = `Design Studio is complete for ${name}: identity, landing, deck, and channels are final.`;
    } else if (design?.status === "locked") {
      text = `Design Studio is still locked. Approve a logo first, then we build the identity and applications.`;
    } else {
      text = `Design Studio is open: ${design?.detail ?? "build identity, then landing, deck, and channels"}.`;
    }
    return { text, jumpStageId: "design" };
  }

  if (asksHandover && (asksWhat || bareStatus || /ready|can i|download|share/.test(q))) {
    return {
      text: isDone(ctx.agenda, "handover")
        ? `Yes — the Brand Handover package for ${name} is ready. Open Brand Handover to download or share the client link.`
        : `Not yet. Finish Design Studio finals — identity, landing, deck, and the four channel templates — then Handover unlocks.`,
      jumpStageId: "handover",
    };
  }

  if (asksContent && (asksWhat || bareStatus || /ready|unlock|have|open/.test(q))) {
    return {
      text: isDone(ctx.agenda, "content")
        ? `Content Studio already has a month of posts ready to review.`
        : isDone(ctx.agenda, "handover")
          ? `The package is ready, so Content Studio should be unlocked. Open it to generate a month of posts from your photos.`
          : `Content Studio unlocks only after the full Brand Handover package is complete.`,
      jumpStageId: "content",
    };
  }

  return null;
}

function answerEs(
  q: string,
  ctx: Pick<FaroCallContext, "projectName" | "agenda" | "beats">
): CallQuickAnswer | null {
  const name = ctx.projectName;
  const current = ctx.agenda.find((a) => a.status === "current");
  const nextTodo = ctx.agenda.find((a) => a.status === "todo" || a.status === "current");
  const locked = ctx.agenda.filter((a) => a.status === "locked").map((a) => a.name);

  const asksLogo = /\b(logo|marca|isotipo|wordmark)\b/.test(q);
  const asksName = /\b(nombre|ortograf[ií]a|title)\b/.test(q) && !asksLogo;
  const asksStrategy = /\b(estrategia|concepto|brief|manifiesto)\b/.test(q);
  const asksDesign = /\b(dise[nñ]o|identidad|landing|deck|visual)\b/.test(q);
  const asksChannel = /\b(sms|email|correo|anuncio|print|impres|canal(es)?)\b/.test(q);
  const asksHandover = /\b(handover|paquete|descargar|compartir|entregable|entrega)\b/.test(q);
  const asksContent = /\b(contenido|posts?|publicaciones|calendario|social)\b/.test(q);
  const asksLeft =
    /\b(falta|queda|siguiente|progreso|estado|dónde estamos|donde estamos|qué falta|que falta)\b/.test(q);
  const asksWhat = /\b(qu[eé] (es|hay)|tenemos|hay|mostrar|muéstrame|muestrame)\b/.test(q);
  const bareStatus = /^(logo|paquete|handover|contenido|nombre)\??$/.test(q);

  if (asksLeft || /dónde estamos|donde estamos|c[oó]mo vamos/.test(q)) {
    const done = ctx.agenda.filter((a) => a.status === "done").map((a) => a.name);
    const parts: string[] = [];
    parts.push(
      current
        ? `Ahora estás en ${current.name.replace(/^\d+\.\s*/, "")}: ${current.detail}.`
        : `Para ${name}, mira la agenda para ver dónde estás.`
    );
    if (done.length) parts.push(`Ya listo: ${done.join(", ")}.`);
    if (locked.length) parts.push(`Aún bloqueado: ${locked.join(", ")}.`);
    if (nextTodo && nextTodo.status !== "current") {
      parts.push(`Después sigue ${nextTodo.name}.`);
    }
    return { text: parts.join(" "), jumpStageId: current?.id as CallStageId | undefined };
  }

  if (asksLogo && (asksWhat || bareStatus || /aprobado|listo|tenemos|hay|mostrar/.test(q))) {
    return {
      text: isDone(ctx.agenda, "logo")
        ? `Sí — ${name} tiene un logo aprobado. Lo ves en la pantalla compartida en el beat del logo, o abre el Taller de logo para cambiarlo.`
        : `Todavía no. ${name} necesita un logo aprobado en el Taller de logo antes de desbloquear Design Studio.`,
      jumpStageId: "logo",
    };
  }

  if (asksName && (asksWhat || bareStatus || /confirm|bloqueado|tenemos|hay/.test(q))) {
    return {
      text: isDone(ctx.agenda, "name")
        ? `Sí — el nombre de marca para logos está bloqueado como ${name}.`
        : `El nombre aún no está confirmado. Abre Nombre de marca para quedarte con “${name}” u otra ortografía.`,
      jumpStageId: "name",
    };
  }

  if (asksStrategy && (asksWhat || /listo|hecho|tenemos|aprobado/.test(q))) {
    return {
      text: isDone(ctx.agenda, "strategy")
        ? `Los esenciales de estrategia de ${name} están listos. Puedes abrir el mapa completo opcional después si quieres más profundidad.`
        : `La estrategia de ${name} sigue en progreso. Termina y aprueba los esenciales de Express primero.`,
      jumpStageId: "strategy",
    };
  }

  if (asksChannel && (asksWhat || /listo|hecho|falta|tenemos|necesario/.test(q))) {
    return {
      text: isDone(ctx.agenda, "design")
        ? `Las plantillas de canal forman parte del paquete de diseño y deberían estar listas con identidad, landing y deck.`
        : `SMS, email, anuncios e impresión son necesarios para Brand Handover. Constrúyelos en Design Studio desde tu estrategia e identidad aprobada.`,
      jumpStageId: "design",
    };
  }

  if (asksDesign && (asksWhat || /listo|hecho|tenemos|falta/.test(q))) {
    const design = stage(ctx.agenda, "design");
    let text: string;
    if (design?.status === "done") {
      text = `Design Studio está completo para ${name}: identidad, landing, deck y canales son finales.`;
    } else if (design?.status === "locked") {
      text = `Design Studio sigue bloqueado. Aprueba un logo primero; luego armamos la identidad y las aplicaciones.`;
    } else {
      text = `Design Studio está abierto: ${design?.detail ?? "arma identidad, luego landing, deck y canales"}.`;
    }
    return { text, jumpStageId: "design" };
  }

  if (asksHandover && (asksWhat || bareStatus || /listo|puedo|descargar|compartir/.test(q))) {
    return {
      text: isDone(ctx.agenda, "handover")
        ? `Sí — el paquete de Brand Handover de ${name} está listo. Abre Brand Handover para descargar o compartir el enlace del cliente.`
        : `Todavía no. Termina los finales de Design Studio — identidad, landing, deck y las cuatro plantillas de canal — y entonces se desbloquea Handover.`,
      jumpStageId: "handover",
    };
  }

  if (asksContent && (asksWhat || bareStatus || /listo|desbloque|tenemos|abrir/.test(q))) {
    return {
      text: isDone(ctx.agenda, "content")
        ? `Content Studio ya tiene un mes de publicaciones listo para revisar.`
        : isDone(ctx.agenda, "handover")
          ? `El paquete está listo, así que Content Studio debería estar desbloqueado. Ábrelo para generar un mes de posts con tus fotos.`
          : `Content Studio solo se desbloquea cuando el paquete completo de Brand Handover está listo.`,
      jumpStageId: "content",
    };
  }

  return null;
}

/**
 * Fast, factual answers for common call questions — no AI round-trip.
 * Returns null when the question needs the LLM.
 */
export function tryAnswerCallQuestion(
  question: string,
  ctx: Pick<FaroCallContext, "projectName" | "agenda" | "beats">,
  locale: string = "en"
): CallQuickAnswer | null {
  const q = question.toLowerCase().trim();
  if (q.length < 2) return null;
  return locale === "es" ? answerEs(q, ctx) : answerEn(q, ctx);
}

/** Honest spoken line when call Q&A cannot reach the live guide. */
export function callGuideUnavailableMessage(locale: string = "en"): string {
  if (locale === "es") {
    return "No puedo responder en vivo sin una clave de estrategia en Ajustes. Pregunta por el logo, el paquete o qué falta — eso sí lo puedo responder desde esta llamada.";
  }
  return "I can't reach the live guide without a strategy AI key in Settings. Try asking about the logo, package, or what's left — I can answer those from this call.";
}
