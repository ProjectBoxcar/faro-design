import { describe, expect, it } from "vitest";
import {
  isNearDuplicateProposal,
  proposalSimilarity,
} from "@/lib/design-similarity";

const templateA = `<!DOCTYPE html><html><head><style>
:root{--primary:#112233;--space:24px}.hero{display:grid;grid-template-columns:2fr 1fr}.card{border-radius:16px;background:#ffffff}
</style></head><body><header class="hero"><h1>Proposal A for North</h1><p>Calm authority</p></header><main><section id="logo"><div class="card"><svg><path d="M0 0h20v20z"/></svg></div></section><section id="color"><div class="card">Blue palette</div></section><section id="type"><div class="card">Serif type</div></section></main></body></html>`;

const colorSwap = `<!DOCTYPE html><html><head><style>
:root{--primary:#ff5522;--space:32px}.hero{display:grid;grid-template-columns:2fr 1fr}.card{border-radius:20px;background:#faf0e8}
</style></head><body><header class="hero"><h1>Proposal B for North</h1><p>Warm connection</p></header><main><section id="logo"><div class="card"><svg><path d="M0 0h40v40z"/></svg></div></section><section id="color"><div class="card">Orange palette</div></section><section id="type"><div class="card">Sans type</div></section></main></body></html>`;

const differentComposition = `<!DOCTYPE html><html><head><style>
body{margin:0;background:#000;color:#fff}.marquee{display:flex;overflow:hidden}.split{display:flex;min-height:100vh}.rail{position:fixed;writing-mode:vertical-rl}.stage{clip-path:polygon(0 0,100% 8%,90% 100%,0 88%)}
</style></head><body><aside class="rail">C / Manifesto</aside><main><section class="stage"><div class="marquee"><h1>REFUSE THE DEFAULT</h1><h1>REFUSE THE DEFAULT</h1></div></section><section class="split" id="logo"><article><svg><polygon points="0,0 80,20 10,90"/></svg></article><article>Angular mark</article></section><section id="color"><ul><li>Black</li><li>Electric</li></ul></section><section id="type"><pre>MONO / CONDENSED</pre></section></main></body></html>`;

describe("proposalSimilarity", () => {
  it("detects exact and same-template color swaps", () => {
    expect(proposalSimilarity(templateA, templateA)).toBe(1);
    expect(proposalSimilarity(templateA, colorSwap)).toBeGreaterThanOrEqual(0.88);
    expect(isNearDuplicateProposal(templateA, colorSwap)).toBe(true);
  });

  it("allows a genuinely different composition with the same required sections", () => {
    expect(proposalSimilarity(templateA, differentComposition)).toBeLessThan(0.88);
    expect(isNearDuplicateProposal(templateA, differentComposition)).toBe(false);
  });
});
