import type { AssetKind } from "@/lib/db/types";

export type IdentityPreviewSection = "overview" | "logo" | "color" | "type" | "components";

export const IDENTITY_PREVIEW_SECTIONS: Array<{ id: IdentityPreviewSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "logo", label: "Logo" },
  { id: "color", label: "Colors" },
  { id: "type", label: "Type" },
  { id: "components", label: "Components" },
];

const previewStyle = `<style data-faro-preview-reset>
html{scroll-behavior:smooth!important;zoom:1!important}body{zoom:1!important;transform:none!important;transform-origin:top left!important;min-width:0!important}section[id]{scroll-margin-top:88px!important}
</style>`;

const previewBridge = `<script data-faro-preview-bridge>
(()=>{const names={logo:['logo','mark','lockup'],color:['color','colour','palette','swatch'],type:['type','typography','font'],components:['component','ui','application']};const find=(key)=>{for(const name of names[key]||[]){const direct=document.getElementById(name)||document.querySelector('[id*="'+name+'" i]');if(direct)return direct}const terms=names[key]||[];return Array.from(document.querySelectorAll('h1,h2,h3,[class*="title" i],[class*="kicker" i]')).find(node=>terms.some(term=>(node.textContent||'').toLowerCase().includes(term)))?.closest('section,article,main,div')||null};const focus=(key)=>{if(key==='overview'){window.scrollTo({top:0,behavior:'smooth'});return}find(key)?.scrollIntoView({behavior:'smooth',block:'start'})};window.addEventListener('message',event=>{if(event.source===window.parent&&event.data?.source==='faro-preview'&&event.data?.action==='focus')focus(event.data.section)});document.addEventListener('click',event=>{const link=event.target.closest?.('a[href^="#"]');if(!link)return;const id=decodeURIComponent(link.getAttribute('href').slice(1));const target=document.getElementById(id);if(!target)return;event.preventDefault();event.stopImmediatePropagation();target.scrollIntoView({behavior:'smooth',block:'start'})},true)})();
</script>`;

export function buildArtifactPreviewHtml(html: string | null, kind: AssetKind): string {
  if (!html) return "<!DOCTYPE html><html><body><p>No preview available.</p></body></html>";
  if (kind !== "design_system") return html;

  let output = html;
  const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  if (/<meta\s+name=["']viewport["'][^>]*>/i.test(output)) {
    output = output.replace(/<meta\s+name=["']viewport["'][^>]*>/i, viewport);
  } else if (/<head[^>]*>/i.test(output)) {
    output = output.replace(/<head([^>]*)>/i, `<head$1>${viewport}`);
  }

  output = /<\/head>/i.test(output)
    ? output.replace(/<\/head>/i, `${previewStyle}</head>`)
    : `${previewStyle}${output}`;
  return /<\/body>/i.test(output)
    ? output.replace(/<\/body>/i, `${previewBridge}</body>`)
    : `${output}${previewBridge}`;
}
