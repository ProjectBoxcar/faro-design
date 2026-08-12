/**
 * Faro product knowledge — short, clear, insightful guidance.
 * Used by hover explain (catalog keys + keyword/href matchers).
 */

export type KnowledgeHit = {
  /** i18n key prefix under explain.k.* e.g. "approve" → explain.k.approve.title */
  id: string;
  /** Match score when testing labels/hrefs (higher wins) */
  score: number;
};

/** Keyword matchers against control label (case-insensitive). First highest score wins. */
export const LABEL_KNOWLEDGE: { re: RegExp; id: string; score: number }[] = [
  { re: /start your brand|empieza tu marca|start a brand/i, id: "startBrand", score: 100 },
  { re: /approve strategy|aprobar estrategia|re-approve|reaprobar/i, id: "approveStrategy", score: 100 },
  { re: /apply my edits|aplicar mis ediciones|apply edits/i, id: "applyEdits", score: 100 },
  { re: /continue to design|continuar a design|logo workshop|taller de logo/i, id: "logoGate", score: 90 },
  { re: /brand handover|entrega de marca|open brand handover|abrir entrega/i, id: "handover", score: 95 },
  { re: /download for product|archivos para|implement pack|product teams|equipos de producto/i, id: "productPack", score: 95 },
  { re: /share brand|compartir paquete|publish|publicar|client link|enlace de cliente/i, id: "sharePackage", score: 90 },
  { re: /build this month|crear los posts|generate month|generar el mes|generate full/i, id: "contentMonth", score: 95 },
  { re: /review photos|revisar fotos|analyze media/i, id: "reviewPhotos", score: 85 },
  { re: /settings|ajustes|ai setup/i, id: "settings", score: 80 },
  { re: /content studio/i, id: "contentStudio", score: 80 },
  { re: /your projects|tus proyectos/i, id: "projectsList", score: 75 },
  { re: /^continue$|^continuar$/i, id: "continueJourney", score: 72 },
  { re: /confirm name|confirmar nombre|brand name|nombre de marca/i, id: "nameConfirm", score: 90 },
  { re: /rewrite with ai|reescribir/i, id: "rewriteAi", score: 85 },
  { re: /^edit$|^editar$|edit card|editar tarjeta/i, id: "editCard", score: 75 },
  { re: /delete project|eliminar proyecto|trash|borrar proyecto/i, id: "delete", score: 80 },
  { re: /language|idioma|english|español|espanol/i, id: "language", score: 75 },
  { re: /^next$|^siguiente$|next step|siguiente paso/i, id: "nextStep", score: 70 },
  { re: /^back$|^atrás$|^atras$|go back|volver/i, id: "back", score: 65 },
  { re: /finish|terminar|create my draft|crear mi borrador/i, id: "finishDraft", score: 90 },
  { re: /new project|nuevo proyecto/i, id: "newProject", score: 80 },
  { re: /viability|brand foundation|base de la marca|looks sound/i, id: "viability", score: 85 },
  { re: /full strategy map|mapa completo|show full strategy|mostrar mapa/i, id: "fullMap", score: 85 },
  { re: /build landing|construir landing|mockup|identity system|sistema de identidad/i, id: "designBuild", score: 85 },
  { re: /preview|vista previa/i, id: "preview", score: 60 },
  { re: /claude key|openai|gemini|api key|clave de claude|clave api/i, id: "apiKeys", score: 90 },
  { re: /continue ·|continuar ·|up next/i, id: "continueJourney", score: 80 },
];

/** Pathname matchers */
export const PATH_KNOWLEDGE: { re: RegExp; id: string; score: number }[] = [
  { re: /^\/$/, id: "pathHome", score: 40 },
  { re: /^\/start/, id: "pathStart", score: 50 },
  { re: /^\/settings/, id: "pathSettings", score: 50 },
  { re: /\/express/, id: "pathExpress", score: 50 },
  { re: /\/name/, id: "pathName", score: 50 },
  { re: /\/studio/, id: "pathLogo", score: 50 },
  { re: /\/design/, id: "pathDesign", score: 50 },
  { re: /\/handover/, id: "pathHandover", score: 50 },
  { re: /\/content/, id: "pathContent", score: 50 },
  { re: /\/review\//, id: "pathReview", score: 45 },
];

/** Href matchers (on links) */
export const HREF_KNOWLEDGE: { re: RegExp; id: string; score: number }[] = [
  { re: /^\/start/, id: "startBrand", score: 90 },
  { re: /^\/settings/, id: "settings", score: 85 },
  { re: /\/express/, id: "pathExpress", score: 80 },
  { re: /\/studio\/logo|\/studio$/, id: "logoGate", score: 85 },
  { re: /\/design/, id: "pathDesign", score: 80 },
  { re: /\/handover/, id: "handover", score: 90 },
  { re: /\/content/, id: "contentStudio", score: 85 },
  { re: /\/share\//, id: "sharePackage", score: 85 },
  { re: /#projects/, id: "projectsList", score: 75 },
];

/**
 * Pick best knowledge id from label + href + pathname.
 */
export function matchProductKnowledge(input: {
  label: string;
  href?: string | null;
  pathname?: string | null;
}): KnowledgeHit | null {
  let best: KnowledgeHit | null = null;

  function consider(id: string, score: number) {
    if (!best || score > best.score) best = { id, score };
  }

  const label = input.label || "";
  for (const m of LABEL_KNOWLEDGE) {
    if (m.re.test(label)) consider(m.id, m.score);
  }

  if (input.href) {
    for (const m of HREF_KNOWLEDGE) {
      if (m.re.test(input.href)) consider(m.id, m.score);
    }
  }

  if (input.pathname) {
    for (const m of PATH_KNOWLEDGE) {
      if (m.re.test(input.pathname)) {
        // path alone is weaker context unless nothing else matched
        consider(m.id, best ? Math.min(m.score, best.score - 1) : m.score);
      }
    }
  }

  return best && best.score >= 50 ? best : null;
}
