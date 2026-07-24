// Prompts for the Brand App Open Design pipeline.
// Each prompt asks the model to return a single, self-contained HTML file.
// The design system is a visual developer handover (not a plain markdown doc).
// Landing pages and decks consume the selected design system and inherit its tokens.

type DesignPromptKind = "design_system" | "landing_page" | "deck";

const CREATIVE_DIRECTIONS: Record<DesignPromptKind, Record<string, string>> = {
  design_system: {
    A: [
      "CREATIVE THESIS A — ARCHITECTURAL EDITORIAL: authority through structure.",
      "Use a strict modular grid, strong left alignment, long vertical rhythm, and generous unframed whitespace.",
      "Pair an expressive serif display face with a neutral sans-serif body. Build hierarchy through scale, not cards.",
      "Use a monochromatic or mineral base with one restrained accent. Create a geometric wordmark or minimal symbol.",
      "Keep motion precise and quiet. Avoid rounded card grids, gradients, glass effects, playful blobs, and centered SaaS layouts.",
    ].join("\n"),
    B: [
      "CREATIVE THESIS B — WARM CONVERSATION: identity as a human dialogue.",
      "Use an asymmetric flowing composition, overlapping moments, rounded modules, and soft transitions between sections.",
      "Use humanist sans-serif or characterful slab typography with weight contrast and relaxed spacing.",
      "Use warm neutrals with two or three companion accents. Create an organic emblem or expressive curved mark.",
      "Let interactions feel tactile and welcoming. Avoid rigid symmetry, cold monochrome, thin institutional lines, and sharp brutalist edges.",
    ].join("\n"),
    C: [
      "CREATIVE THESIS C — PROVOCATIVE TENSION: confidence through deliberate disruption.",
      "Use full-bleed moments, asymmetric grids, extreme scale jumps, hard cuts, and intentional overlap.",
      "Pair bold condensed display type with a monospace or utilitarian body face. Use near-black and near-white with one electric accent.",
      "Create an angular, dynamic mark with a distinctive silhouette. Keep corners sharp and interactions immediate.",
      "Avoid rounded cards, pastel palettes, soft shadows, centered corporate layouts, and restrained editorial calm.",
    ].join("\n"),
  },
  landing_page: {
    A: [
      "CREATIVE THESIS A — EDITORIAL PUBLICATION: the brand acts as a trusted publisher.",
      "Use a narrow reading column, typographic hero, marginal notes, fine rules, and content-led pacing.",
      "Use serif headlines, ink-on-paper neutrals, one accent, documentary imagery, and outline actions.",
      "Avoid feature-card grids, oversized colored CTA bands, rounded SaaS sections, gradients, and decorative dashboard motifs.",
    ].join("\n"),
    B: [
      "CREATIVE THESIS B — GUIDED NARRATIVE: the page unfolds as a warm chapter-based journey.",
      "Alternate image and text compositions, connect sections with visual bridges, and number the story chapters.",
      "Use humanist typography, warm scene-based color shifts, rounded forms, and people-centered imagery.",
      "Avoid a static single-column document, cold product grids, hard section cuts, and generic stock-card layouts.",
    ].join("\n"),
    C: [
      "CREATIVE THESIS C — HIGH-IMPACT COLLISION: the brand enters as a category challenger.",
      "Use full-bleed sections, oversized type, asymmetric composition, hard color changes, and layered content.",
      "Use condensed display type, high contrast, sharp geometry, treated imagery, and direct inline calls to action.",
      "Avoid conventional centered heroes, three-card benefit rows, gentle gradients, pastel surfaces, and soft rounded UI.",
    ].join("\n"),
  },
  deck: {
    A: [
      "CREATIVE THESIS A — AUTHORITATIVE DOCUMENT: the deck feels precise, composed, and enduring.",
      "Use a strict 12-column grid, generous margins, light backgrounds, serif-led hierarchy, and restrained data graphics.",
      "Keep one clear argument per slide with fade-only transitions. Avoid full-bleed color, decorative collage, and startup pitch clichés.",
    ].join("\n"),
    B: [
      "CREATIVE THESIS B — HUMAN PITCH: persuasion through a warm narrative arc.",
      "Vary slide compositions, use chapter markers, people-centered imagery, pull quotes, warm accents, and visual bridges.",
      "Use staggered reveals sparingly. Avoid report-like repetition, dense tables, cold corporate layouts, and disconnected slides.",
    ].join("\n"),
    C: [
      "CREATIVE THESIS C — BRAND MANIFESTO: belief expressed as bold declaration.",
      "Use full-bleed color or imagery, extreme type scale, minimal words, hard cuts, graphic collage, and high contrast.",
      "Let some slides carry one sentence or one word. Avoid small text, white report pages, conventional charts, and subtle transitions.",
    ].join("\n"),
  },
};

export function variantCreativeDirection(kind: DesignPromptKind, variant: string): string {
  return CREATIVE_DIRECTIONS[kind][variant] ?? CREATIVE_DIRECTIONS[kind].A;
}

export function designSystemPrompt(variant: string, brief: string): string {
  return [
    `You are writing a complete visual brand design system handover for a developer. This is proposal "${variant}".`,
    "",
    "This identity system is the CORE brand deliverable. Read the entire brand strategy below — especially the Design Plan — and cover every visual-identity component the plan marks for creation (logo, palette, typography, system elements, and directions for photography, iconography, and illustration where listed), in the plan's execution order. Honor the owner's stated design taste if provided.",
    "",
    "Output MUST be a single, self-contained HTML file (not markdown) with all CSS in a <style> tag and no external dependencies. It will be opened directly in a browser by the designer and the developer.",
    "",
    "Critical preview behavior:",
    "- Build one continuous, native-size vertical guide. Never shrink, scale, zoom, or fit the whole page into a mock browser or device frame.",
    "- Use these exact section ids: logo, color, type, components. Category navigation may use normal anchor links to those ids only.",
    "- Clicking Logo, Colors, Type, or Components must only scroll to that section. Do not use tabs, modals, iframes, cloned page previews, or JavaScript view switching for primary navigation.",
    "- Do not apply transform: scale(), zoom, or layout transforms to html, body, main, or the complete guide.",
    "- Include a standard viewport meta tag: width=device-width, initial-scale=1.",
    "",
    "Mandatory creative direction — this must change composition, typography, shape language, and pacing, not only colors:",
    variantCreativeDirection("design_system", variant),
    "",
    "The HTML must include:",
    "- A hero header with the brand name, one-sentence positioning, and this proposal letter (A/B/C) subtly marked.",
    "- An embedded SVG logo (primary lockup) in the brand colors. The logo must be drawn with clean SVG paths/paths, no external images. Include clearspace and minimum-size rules.",
    "- A color palette section with live swatches, hex codes, OKLch values where possible, and exact usage rules (primary, accent, surface, text, muted, success, danger). Show contrast pairs.",
    "- A typography section showing the display and body fonts at all scale sizes (hero, h1, h2, h3, body, small, caption), with line heights, weights, and a type specimen paragraph.",
    "- A spacing / elevation section with the full token scale (4px base), max-width, container padding, border-radius tokens, and shadow scale.",
    "- A components section with rendered, interactive examples of: primary button, secondary button, ghost button, input, card, badge, link. Show hover/focus states.",
    "- A 'Do & Don't' section with visual examples for logo usage, color misuse, and typography misuse.",
    "- A responsive behavior section with breakpoints and rules.",
    "- An 'Agent Prompt Guide' section telling any future AI how to use this system.",
    "- A footer with the generation credit 'Generated by Brand App'.",
    "",
    "Design quality requirements:",
    "- Execute the mandatory creative thesis at product-grade quality. Its composition, density, typography, color, and shape rules take precedence over generic design conventions.",
    "- All colors and spacing must use CSS custom properties (e.g. --color-primary, --spacing-lg).",
    "- Use system font stacks only. Do not load Google Fonts, CDNs, remote images, external scripts, stylesheets, or any other network resource. The file must work fully offline.",
    "- The page must be responsive and look excellent on desktop and acceptable on mobile.",
    "- Include subtle micro-interactions: hover states, smooth transitions, maybe a dark-mode toggle or theme switch.",
    "- Include @media (prefers-reduced-motion: reduce) support.",
    "",
    "Return ONLY the complete HTML file, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation.",
    "",
    "THE BRAND STRATEGY:",
    brief,
  ].join("\n");
}

export function landingPagePrompt(variant: string, brief: string, designSystem: string): string {
  return [
    `You are building a premium, interactive single-file HTML landing page. This is proposal "${variant}".`,
    "",
    "This landing page is an APPLICATION MOCKUP of the approved brand identity system — it demonstrates the identity in use, per the Design Plan's execution order. It must follow the design system exactly; it is not a place to invent new visual directions.",
    "",
    "Output MUST be a single HTML file with all CSS and JavaScript inline. Use system fonts and embedded SVG/data assets only. Do not load any remote font, image, script, stylesheet, CDN, or network resource; it must work fully offline.",
    "",
    "Mandatory creative direction — this must change page architecture and storytelling, not only colors:",
    variantCreativeDirection("landing_page", variant),
    "",
    "Requirements:",
    "- Execute the mandatory creative thesis at product-grade quality. Its composition, density, typography, color, and pacing override generic landing-page conventions.",
    "- Sections: sticky navigation, hero (brand name + value proposition + CTA), problem, solution, value proposition / 3 benefit cards, social proof, features grid, how it works, pricing preview or CTA band, FAQ accordion with id=\"faq\", footer.",
    "- Interactivity:",
    "  1. Scroll-triggered reveals using Intersection Observer. Elements animate into view with transform-only animations (translateY or scale). Never animate opacity from 0.",
    "  2. Hover effects on buttons (scale + shadow depth + color shift) and cards (subtle lift).",
    "  3. Smooth scroll for anchor links.",
    "  4. A scroll progress indicator at the top of the viewport.",
    "  5. A functional mobile hamburger menu. Its interactive container MUST include data-mobile-menu=\"true\" so the output can be validated.",
    "  6. Counter animation for any metrics.",
    "  7. FAQ accordion with smooth expand/collapse.",
    "  8. Respect @media (prefers-reduced-motion: reduce).",
    "- Copy must be specific to the brand brief. No lorem ipsum, no 'revolutionary' or 'seamless' filler.",
    "- Use ONLY the colors, fonts, and spacing defined in the design system. No generic indigo defaults.",
    "- The logo from the design system should appear in the nav and footer. You can inline a simplified SVG logo or reference the style described.",
    "- Responsive: works on mobile and desktop.",
    "- Include a small design-credit comment in the footer like 'Generated by Brand App'.",
    "",
    "Return ONLY the complete HTML file contents, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation.",
    "",
    "DESIGN SYSTEM:",
    designSystem,
    "",
    "BRAND STRATEGY:",
    brief,
  ].join("\n");
}

export function brandDeckPrompt(variant: string, brief: string, designSystem: string): string {
  return [
    `You are building a premium, multi-slide brand strategy presentation deck as a single HTML file. This is proposal "${variant}".`,
    "",
    "This deck is an APPLICATION MOCKUP of the approved brand identity system — it demonstrates the identity in use, per the Design Plan's execution order. It must follow the design system exactly; it is not a place to invent new visual directions.",
    "",
    "Output MUST be one single HTML file with all CSS and JavaScript inline. Use system fonts and embedded SVG/data assets only. Do not load any remote font, image, script, stylesheet, CDN, or network resource; it must work fully offline.",
    "",
    "Mandatory creative direction — this must change slide composition and pacing, not only colors:",
    variantCreativeDirection("deck", variant),
    "",
    "Requirements:",
    "- Exactly 12 slides in this order:",
    "  1. Title + Concept (brand name, tagline, visual mood summary)",
    "  2. Problem / Context (market gap, why this work matters now)",
    "  3. Solution / Brand Promise (core value proposition)",
    "  4. Purpose & Vision (why the brand exists, where it's headed)",
    "  5. Target Audience (persona, insights, ideal client)",
    "  6. Brand Positioning (differentiation, competitive space)",
    "  7. Personality & Tone (voice characteristics, archetype)",
    "  8. Visual Direction (mood summary, aesthetic, imagery style)",
    "  9. Color & Typography (palette rationale, font choices)",
    "  10. Applications (landing page mock, social, packaging, or touchpoint examples rendered as CSS compositions)",
    "  11. Key Messaging (tagline options, elevator pitch, messaging pillars)",
    "  12. Next Steps / CTA (roadmap, approval needed, timeline)",
    "- Navigation: arrow keys (←/→, ↑/↓), space, page up/down, home/end. Touch/swipe support. On-screen prev/next buttons. Slide counter (e.g. '3 / 12'). Progress bar at top or bottom.",
    "- Each slide must be a <section class=\"slide\" data-slide=\"N\"> with N from 1 through 12 exactly once. Every slide is full-viewport (100vh minimum) and uses a 12-column grid or strong editorial layout. One primary message per slide.",
    "- Animations: cross-fade or slide transition between slides. Content reveals: fade + slide up, 0.6s ease-out-expo, staggered by 0.1s. Use Intersection Observer or slide-enter classes.",
    "- Execute the mandatory creative thesis at presentation-grade quality. Its composition, density, typography, color, and pacing override generic deck conventions. Use specific copy from the brand brief.",
    "- Use ONLY the design system colors, fonts, and spacing. Show the logo in the header of every slide or on the title slide.",
    "- Include a small design-credit comment in the footer like 'Generated by Brand App'.",
    "- Include @media (prefers-reduced-motion: reduce) support.",
    "",
    "Return ONLY the complete HTML file contents, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation.",
    "",
    "DESIGN SYSTEM:",
    designSystem,
    "",
    "BRAND STRATEGY:",
    brief,
  ].join("\n");
}
