import type { AssetKind } from "@/lib/db/types";
import { externalResourceUrls } from "@/lib/design-validation";

export { sanitizeDownloadName } from "@/lib/download-name";

export const FINAL_DESIGN_KINDS = ["design_system", "landing_page", "deck"] as const;
export type FinalDesignKind = (typeof FINAL_DESIGN_KINDS)[number];

const FINAL_META: Record<FinalDesignKind, { label: string; filename: string }> = {
  design_system: { label: "Brand Identity System", filename: "01-brand-identity-system.html" },
  landing_page: { label: "Landing Page", filename: "02-landing-page.html" },
  deck: { label: "Brand Deck", filename: "03-brand-deck.html" },
};

type DeliverableAsset = {
  id: string;
  kind: AssetKind;
  selected: boolean;
  variant: string | null;
  design_system_id: string | null;
  name: string;
  html: string | null;
};

export function missingFinalKinds(assets: DeliverableAsset[]): FinalDesignKind[] {
  return FINAL_DESIGN_KINDS.filter(
    (kind) => !assets.some((asset) => asset.kind === kind && asset.selected && asset.html?.trim())
  );
}

export function finalDeliverableIssue(assets: DeliverableAsset[]): string | null {
  const missing = missingFinalKinds(assets);
  if (missing.length > 0) {
    const labels = missing.map((kind) => FINAL_META[kind].label).join(", ");
    return `Choose a final proposal for: ${labels}.`;
  }
  const identity = assets.find((asset) => asset.kind === "design_system" && asset.selected);
  if (!identity) return "Choose a final proposal for: Brand Identity System.";
  for (const asset of assets.filter((candidate) => candidate.selected)) {
    if (externalResourceUrls(asset.html ?? "").length > 0) {
      return `The final ${FINAL_META[asset.kind as FinalDesignKind]?.label ?? "asset"} uses external resources. Regenerate it before creating an offline deliverable.`;
    }
  }
  for (const kind of ["landing_page", "deck"] as const) {
    const asset = assets.find((candidate) => candidate.kind === kind && candidate.selected);
    if (!asset) return `Choose a final proposal for: ${FINAL_META[kind].label}.`;
    if (asset.design_system_id !== identity.id) {
      return `Choose a final ${FINAL_META[kind].label} generated from the final Brand Identity System.`;
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildFaroDeliverable(
  projectName: string,
  assets: DeliverableAsset[],
  generatedAt = new Date()
): string {
  const issue = finalDeliverableIssue(assets);
  if (issue) throw new Error(issue);

  const outputs = FINAL_DESIGN_KINDS.map((kind) => {
    const asset = assets.find((candidate) => candidate.kind === kind && candidate.selected);
    if (!asset) throw new Error(`Choose a final proposal for: ${FINAL_META[kind].label}.`);
    return {
      kind,
      label: FINAL_META[kind].label,
      variant: asset.variant ?? "Final",
      filename: FINAL_META[kind].filename,
      content: Buffer.from(asset.html ?? "", "utf8").toString("base64"),
    };
  });
  const outputData = JSON.stringify(outputs).replace(/</g, "\\u003c");
  const safeProjectName = escapeHtml(projectName);
  const generatedLabel = escapeHtml(
    generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeProjectName} — Faro Brand Deliverable</title>
<style>
:root{color-scheme:light;--ink:#201d19;--muted:#716b63;--line:#ded8cf;--paper:#faf8f3;--panel:#fff;--accent:#b94f2d;--soft:#f5e8df}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{min-height:100vh;display:grid;grid-template-columns:260px minmax(0,1fr)}aside{border-right:1px solid var(--line);background:rgba(255,255,255,.84);padding:28px 20px;display:flex;flex-direction:column;gap:28px}.mark{font:600 24px Georgia,serif}.eyebrow{margin:0 0 6px;color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:0;font:500 28px/1.1 Georgia,serif}.sub{margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.5}.tabs{display:grid;gap:6px}.tab{width:100%;border:0;border-radius:10px;background:transparent;color:var(--muted);cursor:pointer;padding:11px 12px;text-align:left;font:600 13px/1.2 inherit}.tab:hover,.tab[aria-selected="true"]{background:var(--soft);color:var(--accent)}.credit{margin-top:auto;color:var(--muted);font-size:11px;line-height:1.5}main{min-width:0}.panel{min-height:100vh}.overview{padding:clamp(32px,7vw,96px);display:grid;align-content:center;background:radial-gradient(circle at 80% 15%,#f1d9ca 0,transparent 30%),var(--paper)}.overview-card{max-width:760px}.overview h2{margin:18px 0 12px;font:500 clamp(42px,7vw,84px)/.95 Georgia,serif;letter-spacing:-.04em}.overview p{max-width:600px;color:var(--muted);font-size:17px;line-height:1.6}.deliverables{margin-top:38px;display:grid;gap:10px}.deliverable{display:flex;align-items:center;justify-content:space-between;gap:18px;border-top:1px solid var(--line);padding:15px 0}.deliverable strong{font-size:14px}.deliverable span{color:var(--muted);font-size:12px}.download{border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--ink);cursor:pointer;padding:8px 12px;font:600 12px inherit}.download:hover{border-color:var(--accent);color:var(--accent)}.asset{display:grid;grid-template-rows:auto minmax(0,1fr);height:100vh}.asset-head{display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--line);background:var(--panel);padding:14px 20px}.asset-head h2{margin:0;font:500 20px Georgia,serif}.asset-head span{color:var(--muted);font-size:12px}.asset iframe{width:100%;height:100%;border:0;background:white}@media(max-width:760px){.shell{grid-template-columns:1fr}aside{position:sticky;top:0;z-index:2;border-right:0;border-bottom:1px solid var(--line);padding:14px}.brand-copy,.credit{display:none}.tabs{display:flex;overflow:auto}.tab{white-space:nowrap}.panel,.asset{min-height:calc(100vh - 67px);height:calc(100vh - 67px)}.overview{padding:28px}.overview h2{font-size:44px}}@media print{aside{display:none}.shell{display:block}.panel{display:block!important;height:auto;min-height:100vh;page-break-after:always}.asset{height:100vh}.download{display:none}}
</style>
</head>
<body>
<div class="shell">
<aside>
<div class="brand-copy"><div class="mark">Faro</div><p class="sub">Final brand deliverable</p></div>
<nav class="tabs" aria-label="Deliverable sections">
<button class="tab" type="button" data-panel="overview" aria-selected="true">Overview</button>
${outputs.map((output) => `<button class="tab" type="button" data-panel="${output.kind}" aria-selected="false">${output.label}</button>`).join("\n")}
</nav>
<p class="credit">Created with Faro<br>${generatedLabel}</p>
</aside>
<main>
<section class="panel overview" id="overview">
<div class="overview-card"><p class="eyebrow">Final brand package</p><h2>${safeProjectName}</h2><p>The approved identity system, landing page, and brand deck are collected here as one complete delivery.</p><div class="deliverables">
${outputs.map((output, index) => `<div class="deliverable"><div><strong>${output.label}</strong><br><span>Final proposal ${escapeHtml(output.variant)}</span></div><button class="download" type="button" data-download="${index}">Download source</button></div>`).join("\n")}
</div></div>
</section>
${outputs.map((output) => `<section class="panel asset" id="${output.kind}" hidden><div class="asset-head"><div><h2>${output.label}</h2><span>Final proposal ${escapeHtml(output.variant)}</span></div></div><iframe title="${output.label}" sandbox="allow-scripts"></iframe></section>`).join("\n")}
</main>
</div>
<script>
const outputs=${outputData};
const decode=(encoded)=>{const binary=atob(encoded);const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return new TextDecoder().decode(bytes)};
document.querySelectorAll('.asset').forEach((panel,index)=>{panel.querySelector('iframe').srcdoc=decode(outputs[index].content)});
const activate=(id)=>{document.querySelectorAll('.panel').forEach(panel=>panel.hidden=panel.id!==id);document.querySelectorAll('.tab').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.panel===id)))};
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>activate(tab.dataset.panel)));
document.querySelectorAll('[data-download]').forEach(button=>button.addEventListener('click',()=>{const output=outputs[Number(button.dataset.download)];const blob=new Blob([decode(output.content)],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=output.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}));
</script>
</body>
</html>`;
}
