import "server-only";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { CHANNEL_ASSET_KINDS } from "@/lib/db/types";
import { buildFaroCallContext } from "@/lib/faro-call/beats";
import type { CallAgendaItem, FaroCallContext } from "@/lib/faro-call/types";
import { getProject, getSectionRow } from "@/lib/queries";
import { hasConfirmedBrandName } from "@/lib/naming-propose";
import { buildProjectJourney } from "@/lib/sidebar-journey";
import { getApprovedLogo } from "@/lib/studio";
import { latestCalendarForProject } from "@/lib/content-studio/store";
import type { AppLocale } from "@/lib/i18n/types";

function firstString(value: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!value) return null;
  for (const k of keys) {
    const v = value[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function loadFaroCallContext(
  projectId: string,
  locale: AppLocale = "en"
): FaroCallContext | null {
  const project = getProject(projectId);
  if (!project) return null;

  const journey = buildProjectJourney(projectId);
  const agenda: CallAgendaItem[] = journey.stages.map((s) => ({
    id: s.id as CallAgendaItem["id"],
    name: s.name.replace(/^\d+\.\s*/, ""),
    status: s.status,
    detail: s.detail,
  }));

  const concept = getSectionRow(projectId, "concept")?.value as Record<string, unknown> | undefined;
  const manifesto = getSectionRow(projectId, "manifesto")?.value as Record<string, unknown> | undefined;

  const logo = getApprovedLogo(projectId);
  const payload = (logo?.payload ?? {}) as { svg?: string; svgOnDark?: string };

  const assets = listAssets(projectId);
  const identity = assets.find((a) => a.kind === "design_system" && a.selected);
  const landing = assets.find(
    (a) => a.kind === "landing_page" && a.selected && identity && a.design_system_id === identity.id
  );
  const deck = assets.find(
    (a) => a.kind === "deck" && a.selected && identity && a.design_system_id === identity.id
  );

  const channelLabels = CHANNEL_ASSET_KINDS.map((kind) => {
    const a = assets.find(
      (x) =>
        x.kind === kind &&
        x.selected &&
        identity &&
        x.design_system_id === identity.id &&
        x.html?.trim()
    );
    const labelsEn: Record<string, string> = {
      sms: "SMS template",
      email: "Email template",
      ad: "Ad mockups",
      print: "Print collateral",
    };
    const labelsEs: Record<string, string> = {
      sms: "Plantilla SMS",
      email: "Plantilla de email",
      ad: "Mockups de anuncios",
      print: "Piezas impresas",
    };
    const labels = locale === "es" ? labelsEs : labelsEn;
    return { label: labels[kind] ?? kind, ready: Boolean(a) };
  });

  let contentReady = false;
  try {
    contentReady = Boolean(latestCalendarForProject(projectId)?.posts?.length);
  } catch {
    contentReady = false;
  }

  const confirmed = hasConfirmedBrandName(projectId) ? project.name : null;

  return buildFaroCallContext(
    projectId,
    agenda,
    {
      projectName: project.name,
      confirmedName: confirmed,
      conceptLine: firstString(concept, ["statement", "concept", "essence", "idea"]),
      manifestoLine: firstString(manifesto, ["manifesto", "declaration", "text", "body"]),
      logoSvg: payload.svg ?? null,
      logoSvgOnDark: payload.svgOnDark ?? payload.svg ?? null,
      identityHtml: identity?.html ?? null,
      landingHtml: landing?.html ?? null,
      deckHtml: deck?.html ?? null,
      channelLabels,
      packageReady: finalDeliverableIssue(assets) === null,
      contentReady,
      shareHref: project.share_token ? `/share/${project.share_token}` : null,
      contentHref: `/projects/${projectId}/content`,
      handoverHref: `/projects/${projectId}/handover`,
      designHref: `/projects/${projectId}/design`,
      expressHref: `/projects/${projectId}/express`,
      nameHref: `/projects/${projectId}/name`,
      logoHref: `/projects/${projectId}/studio`,
    },
    locale
  );
}
