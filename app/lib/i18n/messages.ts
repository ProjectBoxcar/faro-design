import type { AppLocale } from "@/lib/i18n/types";

/** Chrome + coach UI strings. Expand as screens adopt t(). */
export type MessageKey =
  | "nav.contentStudio"
  | "nav.settings"
  | "nav.allProjects"
  | "nav.journey"
  | "nav.stages"
  | "nav.journeyOrder"
  | "nav.language"
  | "home.startBrand"
  | "home.yourProjects"
  | "home.kicker"
  | "coach.role"
  | "coach.talkPlaceholder"
  | "coach.footer"
  | "coach.thinking"
  | "coach.error"
  | "coach.open"
  | "coach.hide"
  | "coach.minimize";

const en: Record<MessageKey, string> = {
  "nav.contentStudio": "Content Studio",
  "nav.settings": "Settings",
  "nav.allProjects": "All projects",
  "nav.journey": "Journey",
  "nav.stages": "Stages",
  "nav.journeyOrder":
    "Same order for every project: strategy → name → logo → design → handover → content.",
  "nav.language": "Language",
  "home.startBrand": "Start your brand",
  "home.yourProjects": "Your projects",
  "home.kicker": "Strategy first · then the assets",
  "coach.role": "Lighthouse guide",
  "coach.talkPlaceholder": "Talk to Faro…",
  "coach.footer": "You approve every step — Faro only keeps the light on.",
  "coach.thinking": "Faro is thinking",
  "coach.error":
    "The weather’s rough on the wire. Try again in a moment — or keep going; I’m still here with the map.",
  "coach.open": "Talk to Faro",
  "coach.hide": "Hide Faro for this session",
  "coach.minimize": "Minimize Faro",
};

const es: Record<MessageKey, string> = {
  "nav.contentStudio": "Content Studio",
  "nav.settings": "Ajustes",
  "nav.allProjects": "Todos los proyectos",
  "nav.journey": "Recorrido",
  "nav.stages": "Etapas",
  "nav.journeyOrder":
    "Mismo orden en cada proyecto: estrategia → nombre → logo → diseño → entrega → contenido.",
  "nav.language": "Idioma",
  "home.startBrand": "Empieza tu marca",
  "home.yourProjects": "Tus proyectos",
  "home.kicker": "Primero la estrategia · luego los activos",
  "coach.role": "Guía faro",
  "coach.talkPlaceholder": "Habla con Faro…",
  "coach.footer": "Tú apruebas cada paso — Faro solo mantiene la luz.",
  "coach.thinking": "Faro está pensando",
  "coach.error":
    "Hay tormenta en el cable. Intenta en un momento — o sigue; sigo aquí con el mapa.",
  "coach.open": "Hablar con Faro",
  "coach.hide": "Ocultar a Faro en esta sesión",
  "coach.minimize": "Minimizar a Faro",
};

const TABLES: Record<AppLocale, Record<MessageKey, string>> = { en, es };

export function translate(locale: AppLocale, key: MessageKey): string {
  return TABLES[locale]?.[key] ?? TABLES.en[key] ?? key;
}
