import type { CallAgendaItem, CallBeat, CallStageId, FaroCallContext } from "@/lib/faro-call/types";
import type { AppLocale } from "@/lib/i18n/types";

export type CallAssetSnapshot = {
  projectName: string;
  confirmedName: string | null;
  conceptLine: string | null;
  manifestoLine: string | null;
  logoSvg: string | null;
  logoSvgOnDark: string | null;
  identityHtml: string | null;
  landingHtml: string | null;
  deckHtml: string | null;
  channelLabels: { label: string; ready: boolean }[];
  packageReady: boolean;
  contentReady: boolean;
  shareHref: string | null;
  contentHref: string;
  handoverHref: string;
  designHref: string;
  expressHref: string;
  nameHref: string;
  logoHref: string;
};

function stageIdFromJourney(id: string): CallStageId | null {
  if (id === "strategy" || id === "name" || id === "logo" || id === "design" || id === "handover" || id === "content") {
    return id;
  }
  return null;
}

type L = AppLocale;

function pick(locale: L, en: string, es: string): string {
  return locale === "es" ? es : en;
}

/**
 * Build call agenda + spoken beats from journey status + real project assets.
 * Pure — no DB. Scripts stay grounded in provided snapshot fields only.
 */
export function buildFaroCallContext(
  projectId: string,
  agendaIn: CallAgendaItem[],
  snap: CallAssetSnapshot,
  locale: L = "en"
): FaroCallContext {
  const agenda = agendaIn;
  const name = snap.confirmedName || snap.projectName;
  const beats: CallBeat[] = [];

  beats.push({
    id: "welcome",
    stageId: "strategy",
    line: pick(
      locale,
      `Hi, I'm Faro. We're on a call about ${name}. I'll show you what this project already has — strategy, name, logo, design, and what's left — using the real files. Ask me anything in the chat as we go.`,
      `Hola, soy Faro. Estamos en una llamada sobre ${name}. Te mostraré lo que este proyecto ya tiene — estrategia, nombre, logo, diseño y lo que falta — con los archivos reales. Pregúntame lo que quieras en el chat mientras avanzamos.`
    ),
    media: {
      kind: "text",
      title: pick(locale, "Faro Call", "Faro Call"),
      body: pick(
        locale,
        "Live walkthrough of your brand. Ask questions anytime.",
        "Recorrido en vivo de tu marca. Pregunta cuando quieras."
      ),
    },
  });

  const strategyBody =
    [snap.conceptLine, snap.manifestoLine].filter(Boolean).join("\n\n") ||
    pick(
      locale,
      "Strategy essentials are still drafting. When they're ready, they'll show here.",
      "Los esenciales de estrategia aún se están redactando. Cuando estén listos, aparecerán aquí."
    );
  beats.push({
    id: "strategy-open",
    stageId: "strategy",
    line: snap.conceptLine
      ? pick(
          locale,
          `First, strategy for ${name}. Here's the core idea we drafted from your answers.`,
          `Primero, la estrategia de ${name}. Esta es la idea central que redactamos a partir de tus respuestas.`
        )
      : pick(
          locale,
          `First comes strategy for ${name}. When the essentials are drafted, your concept shows up here.`,
          `Primero viene la estrategia de ${name}. Cuando los esenciales estén listos, tu concepto aparece aquí.`
        ),
    media: {
      kind: "text",
      title: pick(locale, "1. Strategy", "1. Estrategia"),
      body: strategyBody,
      ctaLabel: pick(locale, "Open strategy review", "Abrir revisión de estrategia"),
      ctaHref: snap.expressHref,
    },
  });

  beats.push({
    id: "name-lock",
    stageId: "name",
    line: snap.confirmedName
      ? pick(
          locale,
          `The name locked for logos is ${snap.confirmedName}. Spelling matters — the mark and packages wear this.`,
          `El nombre bloqueado para logos es ${snap.confirmedName}. La ortografía importa — la marca y los paquetes lo llevan.`
        )
      : pick(
          locale,
          `Next we lock the brand name ${name} will wear on the logo. Confirm it when you're ready.`,
          `Después bloqueamos el nombre de marca que ${name} llevará en el logo. Confírmalo cuando quieras.`
        ),
    media: {
      kind: "text",
      title: pick(locale, "2. Brand name", "2. Nombre de marca"),
      body: snap.confirmedName ?? snap.projectName,
      ctaLabel: pick(locale, "Open name workshop", "Abrir taller de nombre"),
      ctaHref: snap.nameHref,
    },
  });

  beats.push({
    id: "logo-show",
    stageId: "logo",
    line: snap.logoSvg
      ? pick(
          locale,
          `Here's the approved mark for ${name}. Design Studio builds the system around this — not the other way around.`,
          `Aquí está la marca aprobada de ${name}. Design Studio construye el sistema alrededor de esto — no al revés.`
        )
      : pick(
          locale,
          `Logo Workshop is next: generate directions, then approve one mark before Design Studio.`,
          `Sigue el Taller de logo: genera direcciones y aprueba una marca antes de Design Studio.`
        ),
    media: snap.logoSvg
      ? {
          kind: "logo",
          title: pick(locale, "3. Logo Workshop", "3. Taller de logo"),
          svg: snap.logoSvg,
          svgOnDark: snap.logoSvgOnDark,
          ctaLabel: pick(locale, "Open Logo Workshop", "Abrir Taller de logo"),
          ctaHref: snap.logoHref,
        }
      : {
          kind: "cta",
          title: pick(locale, "3. Logo Workshop", "3. Taller de logo"),
          body: pick(locale, "No approved logo yet.", "Aún no hay logo aprobado."),
          ctaLabel: pick(locale, "Open Logo Workshop", "Abrir Taller de logo"),
          ctaHref: snap.logoHref,
        },
  });

  beats.push({
    id: "design-identity",
    stageId: "design",
    line: snap.identityHtml
      ? pick(
          locale,
          `This is the Brand Identity System you selected — palette, type, and UI language from the strategy.`,
          `Este es el Sistema de identidad de marca que elegiste — paleta, tipografía y lenguaje de UI desde la estrategia.`
        )
      : pick(
          locale,
          `In Design Studio we choose an identity system grounded in your strategy, then applications.`,
          `En Design Studio elegimos un sistema de identidad anclado a tu estrategia, y luego las aplicaciones.`
        ),
    media: snap.identityHtml
      ? {
          kind: "html",
          title: pick(locale, "4. Brand identity", "4. Identidad de marca"),
          html: snap.identityHtml,
          ctaLabel: pick(locale, "Open Design Studio", "Abrir Design Studio"),
          ctaHref: snap.designHref,
        }
      : {
          kind: "cta",
          title: pick(locale, "4. Design Studio", "4. Design Studio"),
          body: pick(locale, "Identity system not selected yet.", "El sistema de identidad aún no está elegido."),
          ctaLabel: pick(locale, "Open Design Studio", "Abrir Design Studio"),
          ctaHref: snap.designHref,
        },
  });

  if (snap.landingHtml) {
    beats.push({
      id: "design-landing",
      stageId: "design",
      line: pick(
        locale,
        `Here's the landing page mockup — the identity applied to a real page, with copy from the brief.`,
        `Aquí está el mockup de la landing — la identidad aplicada a una página real, con copy del brief.`
      ),
      media: {
        kind: "html",
        title: pick(locale, "Landing page", "Página de aterrizaje"),
        html: snap.landingHtml,
        ctaLabel: pick(locale, "Open Design Studio", "Abrir Design Studio"),
        ctaHref: snap.designHref,
      },
    });
  }

  if (snap.deckHtml) {
    beats.push({
      id: "design-deck",
      stageId: "design",
      line: pick(
        locale,
        `And the brand deck — the story slides built from the same system and strategy.`,
        `Y el deck de marca — las diapositivas de historia construidas con el mismo sistema y estrategia.`
      ),
      media: {
        kind: "html",
        title: pick(locale, "Brand deck", "Deck de marca"),
        html: snap.deckHtml,
        ctaLabel: pick(locale, "Open Design Studio", "Abrir Design Studio"),
        ctaHref: snap.designHref,
      },
    });
  }

  if (snap.channelLabels.length) {
    beats.push({
      id: "design-channels",
      stageId: "design",
      line: pick(
        locale,
        `Channel templates — SMS, email, ads, and print — carry the same identity into everyday touchpoints.`,
        `Las plantillas de canal — SMS, email, anuncios e impresión — llevan la misma identidad a los puntos de contacto cotidianos.`
      ),
      media: {
        kind: "checklist",
        title: pick(locale, "Channel templates", "Plantillas de canal"),
        items: snap.channelLabels,
        ctaLabel: pick(locale, "Open Design Studio", "Abrir Design Studio"),
        ctaHref: snap.designHref,
      },
    });
  }

  beats.push({
    id: "handover",
    stageId: "handover",
    line: snap.packageReady
      ? pick(
          locale,
          `Your Brand Handover package is ready — identity, landing, deck, and channels from strategy. You can download files or share a private client link.`,
          `Tu paquete de Brand Handover está listo — identidad, landing, deck y canales desde la estrategia. Puedes descargar archivos o compartir un enlace privado al cliente.`
        )
      : pick(
          locale,
          `Brand Handover unlocks when all package finals are chosen. Until then we keep building in Design Studio.`,
          `Brand Handover se desbloquea cuando todos los finales del paquete están elegidos. Hasta entonces seguimos construyendo en Design Studio.`
        ),
    media: {
      kind: "checklist",
      title: pick(locale, "5. Brand Handover", "5. Brand Handover"),
      items: [
        {
          label: pick(locale, "Brand Identity System", "Sistema de identidad de marca"),
          ready: Boolean(snap.identityHtml),
        },
        {
          label: pick(locale, "Landing page", "Página de aterrizaje"),
          ready: Boolean(snap.landingHtml),
        },
        {
          label: pick(locale, "Brand deck", "Deck de marca"),
          ready: Boolean(snap.deckHtml),
        },
        ...snap.channelLabels,
      ],
      ctaLabel:
        snap.packageReady && snap.shareHref
          ? pick(locale, "Open client share link", "Abrir enlace del cliente")
          : pick(locale, "Open Brand Handover", "Abrir Brand Handover"),
      ctaHref: snap.packageReady && snap.shareHref ? snap.shareHref : snap.handoverHref,
    },
  });

  beats.push({
    id: "content",
    stageId: "content",
    line: snap.contentReady
      ? pick(
          locale,
          `Content Studio has a month of posts ready — the brand put to work from your real photos, still grounded in strategy.`,
          `Content Studio tiene un mes de publicaciones listo — la marca puesta a trabajar con tus fotos reales, aún anclada a la estrategia.`
        )
      : pick(
          locale,
          `After the package is complete, Content Studio builds a month of posts. That's when this journey is fully done.`,
          `Cuando el paquete está completo, Content Studio arma un mes de publicaciones. Ahí el recorrido queda terminado.`
        ),
    media: {
      kind: "cta",
      title: pick(locale, "6. Content Studio", "6. Content Studio"),
      body: snap.contentReady
        ? pick(locale, "Month of posts is ready to review.", "El mes de publicaciones está listo para revisar.")
        : pick(
            locale,
            "Unlocks after the full Brand Handover package.",
            "Se desbloquea tras el paquete completo de Brand Handover."
          ),
      ctaLabel: pick(locale, "Open Content Studio", "Abrir Content Studio"),
      ctaHref: snap.contentHref,
    },
  });

  const closeStageId: CallStageId = beats.some((b) => b.stageId === "content") ? "content" : "handover";
  beats.push({
    id: "close",
    stageId: closeStageId,
    line: pick(
      locale,
      `That's the walkthrough for ${name}. Use Leave to go back to the project pages if you want to edit anything. Ask me more questions anytime before you go.`,
      `Ese es el recorrido de ${name}. Usa Salir para volver a las páginas del proyecto si quieres editar algo. Pregúntame más cuando quieras antes de irte.`
    ),
    media: {
      kind: "text",
      title: pick(locale, "Thanks for joining", "Gracias por unirte"),
      body: pick(
        locale,
        "This call only presents what you've already built. Edit on the normal pages anytime.",
        "Esta llamada solo presenta lo que ya construiste. Edita en las páginas normales cuando quieras."
      ),
      ctaLabel: pick(locale, "Back to project", "Volver al proyecto"),
      ctaHref: `/projects/${projectId}`,
    },
  });

  const current = agenda.find((a) => a.status === "current") ?? agenda.find((a) => a.status === "todo");
  const currentId = current ? stageIdFromJourney(current.id) : "strategy";
  let startBeatIndex = beats.findIndex((b) => b.stageId === currentId && b.id !== "welcome");
  if (startBeatIndex < 0) startBeatIndex = 0;

  return {
    projectId,
    projectName: snap.projectName,
    agenda,
    beats,
    startBeatIndex,
  };
}
