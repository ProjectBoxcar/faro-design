// Prompts for the Brand App Open Design pipeline.
// Each prompt asks the model to return a single, self-contained HTML file.
// The design system is a visual developer handover (not a plain markdown doc).
// Landing pages and decks consume the selected design system and inherit its tokens.

type DesignPromptKind = "design_system" | "landing_page" | "deck";

export type ChannelPromptKind = "sms" | "email" | "ad" | "print";

// Layout theses only — visual *meaning*, copy, audience, and tone MUST come
// exclusively from the strategy brief. Theses never invent brand claims.
const CREATIVE_DIRECTIONS: Record<DesignPromptKind, Record<string, string>> = {
  design_system: {
    A: [
      "LAYOUT THESIS A — clear structure: modular grid, strong hierarchy, calm spacing.",
      "Express ONLY the emotional territory, personality, and design taste already in the brief.",
      "Palette and type must be derived from the brief (and Design Plan) — no invented brand story.",
    ].join("\n"),
    B: [
      "LAYOUT THESIS B — human and approachable: softer modules, warmer rhythm, readable density.",
      "Express ONLY the emotional territory, personality, and design taste already in the brief.",
      "Palette and type must be derived from the brief (and Design Plan) — no invented brand story.",
    ].join("\n"),
    C: [
      "LAYOUT THESIS C — bold and decisive: higher contrast, stronger scale jumps, sharper edges.",
      "Express ONLY the emotional territory, personality, and design taste already in the brief.",
      "Palette and type must be derived from the brief (and Design Plan) — no invented brand story.",
    ].join("\n"),
  },
  landing_page: {
    A: [
      "LAYOUT THESIS A — editorial reading layout: narrow measure, clear sections, calm pacing.",
      "All headlines, benefits, proof, and CTAs MUST quote or paraphrase the strategy brief only.",
    ].join("\n"),
    B: [
      "LAYOUT THESIS B — guided narrative layout: alternating blocks, chapter markers, progressive reveal.",
      "All headlines, benefits, proof, and CTAs MUST quote or paraphrase the strategy brief only.",
    ].join("\n"),
    C: [
      "LAYOUT THESIS C — high-impact layout: larger type, stronger contrast, fewer words per block.",
      "All headlines, benefits, proof, and CTAs MUST quote or paraphrase the strategy brief only.",
    ].join("\n"),
  },
  deck: {
    A: [
      "LAYOUT THESIS A — precise document: grid, margins, one argument per slide.",
      "Slide copy MUST come only from the strategy brief and design system — invent nothing.",
    ].join("\n"),
    B: [
      "LAYOUT THESIS B — narrative pitch: varied compositions, warm arc, chapter markers.",
      "Slide copy MUST come only from the strategy brief and design system — invent nothing.",
    ].join("\n"),
    C: [
      "LAYOUT THESIS C — manifesto pacing: bold slides, short lines, high contrast.",
      "Slide copy MUST come only from the strategy brief and design system — invent nothing.",
    ].join("\n"),
  },
};

const BRIEF_FIDELITY_RULES = [
  "CRITICAL — STRATEGY BRIEF FIDELITY (non-negotiable):",
  "- The strategy brief is the SOLE source of truth for brand meaning, claims, audience, tone, promise, concept, and positioning.",
  "- Do NOT invent product features, benefits, markets, taglines, values, or stories that are not supported by the brief.",
  "- Do NOT introduce generic startup clichés or placeholder industries. If the brief is silent on a detail, omit it or stay abstract — never fabricate.",
  "- Copy on landing pages and decks must paraphrase the brief; visual style must express the brief's personality, emotional territory, and design taste.",
  "- The Design Plan (if present) governs what to create and in what order; do not expand scope beyond it.",
].join("\n");

export function variantCreativeDirection(kind: DesignPromptKind, variant: string): string {
  return CREATIVE_DIRECTIONS[kind][variant] ?? CREATIVE_DIRECTIONS[kind].A;
}

export function designSystemPrompt(
  variant: string,
  brief: string,
  approvedLogoSvg: string,
  refine?: { baseHtml?: string; feedback?: string } | null
): string {
  const refineBlock =
    refine?.baseHtml || refine?.feedback
      ? [
          "",
          "MODE: IMPROVE AN EXISTING IDENTITY PROPOSAL THE OWNER LIKED.",
          "Keep the same strategic meaning and approved logo. Produce a refined full HTML system — not a brand-new unrelated direction.",
          refine?.feedback
            ? `OWNER FEEDBACK (highest priority after strategy + logo — apply these changes):\n${refine.feedback}`
            : "No free-text feedback — refine craft, hierarchy, and clarity while staying on this direction.",
          refine?.baseHtml
            ? `BASE PROPOSAL HTML (preserve what works; improve against feedback):\n${refine.baseHtml.slice(0, 12000)}`
            : "",
          "Every refinement must clearly respond to the owner feedback when provided.",
          "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  return [
    `You are writing a complete visual brand design system handover for a developer. This is proposal "${variant}".`,
    "",
    "This identity system is the CORE brand deliverable AFTER the logo has already been approved in the Logo Workshop.",
    "Read the brand strategy below — especially concept, brief findings, personality, tone, promise, design taste, and Design Plan — and cover palette, typography, icons, UI components, and (when the plan asks) photography/illustration direction.",
    "",
    BRIEF_FIDELITY_RULES,
    "",
    "CRITICAL — LOGO RULE (non-negotiable):",
    "- The logo was already designed and approved in the Logo Workshop. You MUST NOT invent, redraw, redesign, or replace it.",
    "- Embed the exact approved SVG below (you may wrap it for clearspace demos, but do not change paths/shapes).",
    "- Build color, type, icons, and components so they SUPPORT this mark — never a competing mark.",
    "",
    "APPROVED LOGO SVG (embed this verbatim in the #logo section):",
    approvedLogoSvg,
    refineBlock,
    "Output MUST be a single, self-contained HTML file (not markdown) with all CSS in a <style> tag and no external dependencies. It will be opened directly in a browser by the designer and the developer.",
    "",
    "Critical preview behavior:",
    "- Build one continuous, native-size vertical guide. Never shrink, scale, zoom, or fit the whole page into a mock browser or device frame.",
    "- Use these exact section ids: logo, color, type, icons, components. Category navigation may use normal anchor links to those ids only.",
    "- Clicking Logo, Colors, Type, Icons, or Components must only scroll to that section. Do not use tabs, modals, iframes, cloned page previews, or JavaScript view switching for primary navigation.",
    "- Do not apply transform: scale(), zoom, or layout transforms to html, body, main, or the complete guide.",
    "- Include a standard viewport meta tag: width=device-width, initial-scale=1.",
    "",
    "Layout thesis (composition only — still bound to the brief's meaning):",
    variantCreativeDirection("design_system", variant),
    "",
    "The HTML must include:",
    "- A hero header with the brand name, one-sentence positioning taken from the brief, and this proposal letter (A/B/C) subtly marked.",
    "- A #logo section that embeds the APPROVED logo SVG above, plus clearspace and minimum-size rules. Do not draw a new logo.",
    "- A color palette section with live swatches, hex codes, OKLch values where possible, and exact usage rules (primary, accent, surface, text, muted, success, danger). Show contrast pairs. Colors must feel consistent with the brief's emotional territory and design taste.",
    "- A typography section showing the display and body fonts at all scale sizes (hero, h1, h2, h3, body, small, caption), with line heights, weights, and a type specimen paragraph using brief-aligned sample copy only.",
    "- A spacing / elevation section with the full token scale (4px base), max-width, container padding, border-radius tokens, and shadow scale.",
    "- A REQUIRED #icons section with a real icon system — not a text note saying 'use icons later':",
    "  * Draw 10–14 original icons as INLINE SVG (path/line/circle/rect only). No emoji, no icon fonts, no external SVG URLs, no Lucide/Font Awesome/CDN.",
    "  * Include both product/UI icons (e.g. home, search, user, settings, check, close, arrow, mail, calendar, plus) AND 2–4 icons that reflect the brand's domain from the strategy (not generic filler).",
    "  * One coherent geometric language: same stroke width (or same fill weight), corner treatment, and optical size — harmonize with the approved logo's geometry without copying its paths.",
    "  * Show each icon at 24px and 32px in monochrome and primary brand color; label every icon.",
    "  * Document rules: min size, stroke/fill, when to use monochrome vs brand color, do/don't for over-detail.",
    "  * Icons must be visible in the HTML output (rendered <svg> elements), not described in prose only.",
    "- A #components section with rendered, interactive examples of: primary button, secondary button, ghost button, input, card, badge, link. Prefer buttons that include an icon from #icons. Show hover/focus states.",
    "- A 'Do & Don't' section with visual examples for logo usage (using the approved mark), color misuse, typography misuse, and icon misuse.",
    "- A responsive behavior section with breakpoints and rules.",
    "- An 'Agent Prompt Guide' section telling any future AI how to use this system (including the icon set) and to never invent claims beyond the brief.",
    "- A footer with the generation credit 'Generated by Brand App'.",
    "",
    "Design quality requirements:",
    "- Brief fidelity beats decorative inventiveness. If a choice is not grounded in the strategy, do not make it.",
    "- All colors and spacing must use CSS custom properties (e.g. --color-primary, --spacing-lg).",
    "- Use system font stacks only. Do not load Google Fonts, CDNs, remote images, external scripts, stylesheets, or any other network resource. The file must work fully offline.",
    "- Icons and decorative marks must be inline SVG or pure CSS — never remote images.",
    "- The page must be responsive and look excellent on desktop and acceptable on mobile.",
    "- Include subtle micro-interactions: hover states, smooth transitions, maybe a dark-mode toggle or theme switch.",
    "- Include @media (prefers-reduced-motion: reduce) support.",
    "",
    "Return ONLY the complete HTML file, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation.",
    "",
    "THE BRAND STRATEGY (sole source of truth):",
    brief,
  ].join("\n");
}

export function landingPagePrompt(variant: string, brief: string, designSystem: string): string {
  return [
    `You are building a premium, interactive single-file HTML landing page. This is proposal "${variant}".`,
    "",
    "This landing page is an APPLICATION MOCKUP of the approved brand identity system — it demonstrates the identity in use, per the Design Plan's execution order. It must follow the design system exactly; it is not a place to invent new visual directions. Use the design system's logo as-is — never invent or redraw a logo.",
    "",
    BRIEF_FIDELITY_RULES,
    "",
    "Output MUST be a single HTML file with all CSS and JavaScript inline. Use system fonts and embedded SVG/data assets only. Do not load any remote font, image, script, stylesheet, CDN, or network resource; it must work fully offline.",
    "",
    "Layout thesis (structure only — all words and claims from the brief):",
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
    "- The approved logo from the design system should appear in the nav and footer. Inline that SVG; do not invent a different mark.",
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
    "This deck is an APPLICATION MOCKUP of the approved brand identity system — it demonstrates the identity in use, per the Design Plan's execution order. It must follow the design system exactly; it is not a place to invent new visual directions. Use the design system's logo as-is — never invent or redraw a logo.",
    "",
    BRIEF_FIDELITY_RULES,
    "",
    "Output MUST be one single HTML file with all CSS and JavaScript inline. Use system fonts and embedded SVG/data assets only. Do not load any remote font, image, script, stylesheet, CDN, or network resource; it must work fully offline.",
    "",
    "Layout thesis (structure only — all words and claims from the brief):",
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
    "- Use ONLY the design system colors, fonts, and spacing. Show the approved logo (from the design system) in the header of every slide or on the title slide — do not invent a new mark.",
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

const CHANNEL_SPECS: Record<
  ChannelPromptKind,
  { title: string; frame: string; requirements: string[] }
> = {
  sms: {
    title: "SMS / text message template",
    frame: "Phone SMS thread mockup (one conversation bubble from the brand).",
    requirements: [
      "- Realistic phone chrome (CSS) with a short SMS from the brand (≤160 chars ideal; max 320).",
      "- Message copy MUST come only from the strategy brief. No invented discounts.",
      "- Brand name / approved logo small in the phone header.",
      "- Show character count and a non-functional Send affordance.",
    ],
  },
  email: {
    title: "Marketing email template",
    frame: "Light email-client preview containing one HTML email.",
    requirements: [
      "- Header with logo, hero from concept/promise, 1–2 short body paragraphs from the brief, primary CTA, footer.",
      "- ~600px content column; design-system colors only.",
      "- Subject line + preview text above the body (brief language only).",
      "- Embed approved logo SVG from the design system.",
    ],
  },
  ad: {
    title: "Paid social / display ad mockups",
    frame: "Two ad sizes: 1080×1080 feed and 1080×1920 story.",
    requirements: [
      "- Two labeled canvases: Feed 1:1 and Story 9:16.",
      "- Each: logo, short headline from the brief, optional subline, CTA chip.",
      "- CSS/shapes/type only — no remote images. Express emotional territory from the brief.",
      "- Few words, large type, safe margins.",
    ],
  },
  print: {
    title: "Print collateral mockups",
    frame: "Business card (front+back) and an A5 flyer on cream paper.",
    requirements: [
      "- Business card front + back; A5/flyer beside them.",
      "- Design-system colors, type, approved logo SVG.",
      "- Card: brand + one-line promise from brief; generic contact labels only (no fake numbers).",
      "- Flyer: hero line + short support from brief + logo.",
    ],
  },
};

/** SMS, email, ad, and print templates bound to identity + strategy. */
export function channelTemplatePrompt(
  kind: ChannelPromptKind,
  brief: string,
  designSystem: string
): string {
  const spec = CHANNEL_SPECS[kind];
  return [
    `You are building a premium, single-file HTML mockup: ${spec.title}.`,
    "",
    "This is an APPLICATION TEMPLATE of the approved brand identity — follow the design system exactly; use the approved logo as-is. Never invent or redraw a logo.",
    "",
    BRIEF_FIDELITY_RULES,
    "",
    "Output MUST be one HTML file with all CSS inline. System fonts and inline SVG only. No remote assets — fully offline.",
    "",
    `Presentation frame: ${spec.frame}`,
    "",
    "Requirements:",
    ...spec.requirements,
    "- Label the channel clearly (SMS / Email / Ad / Print).",
    "- Footer credit: Generated by Faro Design.",
    "- Respect @media (prefers-reduced-motion: reduce).",
    "",
    "Return ONLY the complete HTML file, starting with <!DOCTYPE html> and ending with </html>. No markdown fences.",
    "",
    "DESIGN SYSTEM:",
    designSystem,
    "",
    "BRAND STRATEGY:",
    brief,
  ].join("\n");
}
