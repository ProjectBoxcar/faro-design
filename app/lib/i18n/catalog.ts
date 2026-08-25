/**
 * Full UI catalogs — English & Spanish.
 * Keys use dot paths: t("start.q1.title")
 */

export type Catalog = Record<string, unknown>;

export const en: Catalog = {
  common: {
    continue: "Continue",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    back: "Back",
    next: "Next",
    loading: "Loading…",
    error: "Something went wrong",
    optional: "Optional",
    yes: "Yes",
    no: "No",
    open: "Open",
    close: "Close",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    settings: "Settings",
    home: "Home",
    stages: "stages",
  },
  nav: {
    contentStudio: "Content Studio",
    settings: "Settings",
    allProjects: "All projects",
    journey: "Journey",
    stages: "Stages",
    journeyOrder:
      "Same order for every project: strategy → name → logo → design → handover → content.",
    language: "Language",
    workspace: "Workspace",
  },
  stage: {
    strategy: "Strategy",
    name: "Brand name",
    logo: "Logo Workshop",
    design: "Design Studio",
    handover: "Brand Handover",
    content: "Content Studio",
  },
  home: {
    startBrand: "Start your brand",
    yourProjects: "Your projects",
    kicker: "Strategy first · then the assets",
    headline: "A brand you can actually explain.",
    lede:
      "Most tools invent a logo first. Faro starts with a strategy you can say out loud—then name, mark, system, and a clean handoff. You approve every step.",
    howItWorks: "How it works",
    howTitle: "From unsure to a direction you can see.",
    packageKicker: "The whole package",
    packageTitle: "A brand, not a file.",
    packageBlurb:
      "You'll leave with a strategy you can explain, a locked name and logo, identity + landing + deck, and files builders can use—from your answers, not a random style pack.",
    emptyTitle: "No projects yet.",
    emptyBlurb: "Start your first brand project—strategy first, then the assets.",
    workspace: "Workspace",
    footerTag: "Strategy first. Then the assets.",
    step1Title: "Answer plainly",
    step1Text: "A few honest questions about what you do and who it's for.",
    step2Title: "Approve the strategy",
    step2Text:
      "Edit until it sounds like you. Approve when it’s true—then we name it and build the mark on that foundation.",
    step3Title: "Hand off cleanly",
    step3Text: "System, mockups, and files your designer or product team can use.",
  },
  illustrations: {
    heroHarbour: "Photo of a lighthouse beaming over a harbour at golden hour",
    stepAnswer: "Photo of hands writing in a notebook under a desk lamp",
    stepStrategy: "Photo of strategy notes ordered into a stack with a lighthouse paperweight",
    stepHandoff: "Photo of hands exchanging color samples and a brand package",
    emptyHarbour: "Photo of an empty dock and distant lighthouse at dawn",
    startInterview: "Photo of a calm interview table with tea and an open notebook",
    settingsKeys: "Photo of three keys on a tray next to a small lighthouse light",
    stageStrategy: "Photo of a brass compass and planning page — strategy",
    stageName: "Photo of a blank nameplate and fountain pen — brand name",
    stageLogo: "Photo of a monogram sketch on a small easel — logo workshop",
    stageDesign: "Photo of UI mockups and color chips — design studio",
    stageHandover: "Photo of a sealed envelope and ribboned package — brand handover",
    stageContent: "Photo of a content calendar board and camera — content studio",
  },
  start: {
    title: "Let's build your brand",
    intro:
      "First, a few plain questions. Then, a strategy draft you review and fix—step by step. No branding experience needed.",
    brandName: "Brand name",
    brandNameHint:
      "A working title is fine. After your strategy draft, we can suggest a stronger brand name before logos.",
    brandNamePh: "e.g. Finisterra — or a temporary working title",
    company: "Company / your name (optional)",
    companyPh: "Who this brand belongs to",
    greenfield: "This is a brand-new brand with no existing logo or materials yet.",
    personal: "This is my own project — no paying client behind it (yet).",
    blank: "Prefer to fill everything in yourself? Start a blank project.",
    questionOf: "Question {n} of {total}",
    typeHint: "A few sentences is plenty — Next unlocks once you type something.",
    needName: "Give your brand a name to continue.",
    finish: "Finish & create my draft",
    building: "Building your strategy draft…",
    draftingTitle: "Drafting your strategy…",
    draftingDesc:
      "We're turning your answers into a first draft of your brand's foundations. Next, you'll review it step by step.",
    stepOf: "Step {n} of {total}",
    startBtn: "Start",
    needAnswer: "Write a short answer to continue.",
    needNameFirst: "Give your brand a name first.",
    q1Title: "What do you sell, and who is it for?",
    q1Help:
      "Describe what you actually offer and the kind of client who gets the most out of it. Don't worry about polish — just tell it plainly.",
    q1Ph: "We help independent architecture studios… Our best clients are…",
    q2Title: "How did it start, and where are you taking it?",
    q2Help:
      "How the business began, anything that shaped how you work, and where you'd like it to be in a few years.",
    q2Ph: "I started this after… What I learned was… In a few years I want…",
    q3Title: "What makes you different — and what do you believe about your industry?",
    q3Help:
      "What clients get from you that they can't get elsewhere, and any convictions you hold about how your field should work.",
    q3Ph: "Unlike most studios we… I believe our industry gets ___ wrong because…",
    q4Title: "How does the business run, and where does it show up?",
    q4Help:
      "How many products/services you offer, your price level (premium, mid-range, budget), where the brand appears (website, Instagram, packaging, storefront…), and how customers find you.",
    q4Ph:
      "Three services, premium-priced. The brand lives on our website, Instagram and packaging. Most clients come from referrals…",
    q5Title: "What's one thing that's true about you a competitor couldn't honestly say?",
    q5Help:
      "The hardest-to-copy thing — a standard you hold, a way you work, something only you could claim.",
    q5Ph: "We've never shipped a brand we didn't believe in…",
    q6Title: "How should the brand look and feel?",
    q6Help:
      "Brands or styles you admire, the feeling you want people to have, and anything you definitely don't want (colors, moods, clichés). This guides the design work.",
    q6Ph:
      "Clean and calm, like Aesop or Apple. Warm but confident. Please no neon colors or startup clichés…",
  },
  settings: {
    title: "Settings",
    blurb:
      "Paste your keys once so Faro can write strategy, invent logos, and build your design package. Everything stays on this computer.",
    whatsReady: "What's ready",
    whatsReadyBlurb:
      "Faro uses a few keys so it can write strategy, invent logos, and build your design package. You only need to paste them once — they stay on this computer.",
  },
  setup: {
    ready: "AI setup ready.",
    readyDetail:
      "Strategy, logo, and design look good{daemon}. Longer steps may still take a few minutes.",
    daemonUp: " · design helper up",
    needed: "A bit of setup before AI stages",
    strategyOff: "Strategy writing needs a Claude key (Settings).",
    logoOff: "Logo Workshop needs an OpenAI or Gemini key (Settings).",
    designOff: "Design Studio needs a Claude key and Faro's design helper running.",
    daemonDown: "Design helper isn't running — start Faro with start.bat.",
    footerAfterLink: ", then start Faro with start.bat if needed.",
  },
  viability: {
    brandFoundation: "Brand foundation",
    looksSoundNoted: "Looks sound (noted)",
    notChecked: "Not checked yet",
    notCheckedBlurb: "This check runs automatically once the key business answers are on file.",
    pass: "Looks sound",
    passBlurb: "The basics of this brand project look solid enough to continue.",
    caveat: "Proceed with care",
    caveatBlurb: "You can continue, but a few warning signs or soft gaps showed up.",
    fail: "Needs attention",
    failBlurb: "Something foundational failed this check. You can still continue with a short reason.",
  },
  express: {
    kicker: "Strategy review",
    titleSuffix: "— strategy essentials",
    lede:
      "Read the essentials. Change anything that doesn't sound like you. When these cards feel right, approve and continue to the brand name.",
    helper:
      "Edit what doesn't sound like you. Apply my edits to update related cards. Full map stays optional.",
    applyEdits: "Apply my edits",
    edit: "Edit",
    rewriteAi: "Rewrite with AI",
    approve: "Approve strategy · continue to brand name",
    reapprove: "Re-approve · continue",
    fullMap: "Optional: open the full strategy map",
    projectHub: "Project hub",
    editFirst: "Apply your edits (or Cancel) on this card before approving.",
    stillUpdating: "Still updating strategy cards from your last edit — wait a moment.",
    conceptNote:
      "New concept draft. Edit if you like, then Apply my edits so the manifesto and design plan follow this idea — or try another concept.",
    applyFollow: "Apply my edits to update the rest.",
    updating: "Updating the strategy from your edit",
    rewriting: "Rewriting {name}…",
    applying: "Applying your change…",
    draftingTitle: "Drafting the {name} strategy",
    draftingDesc:
      "Your answers are becoming a complete brand strategy and design plan. This takes a few minutes — you'll review everything on one page when it's ready.",
    stoppedTitle: "Strategy drafting stopped",
    stoppedDesc:
      "You stopped generation. Sections already drafted are kept — resume when you are ready.",
    pausedTitle: "Strategy drafting paused",
    pausedDesc:
      "Something went wrong mid-run. Progress so far is kept — you can continue from here.",
    interruptedTitle: "Drafting was interrupted",
    interruptedDesc:
      "The server restarted while strategy was still drafting. Everything already written is saved.",
    failedDefault: "Strategy drafting failed.",
    stoppedDefault: "Generation stopped. You can resume from where it left off.",
    continueDrafting: "Continue drafting",
    resumeDrafting: "Resume drafting",
    stopGeneration: "Stop generation",
    stopping: "Stopping…",
    stopHint: "Stops after the current section finishes. Progress so far is kept.",
    sectionsProgress: "{done} of {total} sections",
  },
  fullPlan: {
    show: "Show full strategy map (optional)",
    hide: "Hide full strategy map",
    blurb:
      "Optional full map. Day-to-day progress follows Continue and the journey rail (strategy review → name → logo → design).",
  },
  name: {
    title: "Brand name",
    confirm: "Confirm name",
    workshop: "Name workshop",
  },
  logo: {
    title: "Logo Workshop",
    continueDesign: "Continue to Design Studio",
    approved: "is approved. Continue when you are.",
  },
  design: {
    title: "Design Studio",
    lede:
      "Your approved logo leads. Compare three identity directions, choose one final, then build the landing page and deck from that system—tied to your strategy, not guesswork.",
    setupTitle: "Design Studio needs a strategy AI key in Settings.",
    setupHint:
      "Paste your strategy key once in Settings. Logo Workshop uses a different key — not this path.",
    notSetup:
      "Design Studio isn't set up yet. Add your strategy AI key in Settings so the design helper can run.",
    daemonDownTitle: "Design helper isn't running",
    daemonDownHint:
      "Restart Faro with start.bat (or start.ps1), wait until the app is ready, then tap Retry. Progress already saved won't be wiped.",
    retryHelper: "Retry — check helper",
    pausedTitle: "Design generation paused",
    failedDefault: "Design generation failed.",
    resumeHint: "Progress so far is kept — continue when the helper is ready.",
    continueGenerating: "Continue generating",
    needIdentity: "Choose a Brand Identity System proposal first.",
    identityNext: "Identity chosen — next: application mockups",
    buildMockups: "Build landing page & deck",
    visualsReady: "Visuals ready — finish the package on Brand Handover",
    chooseFinals: "Choose your finals · {n}/3 ready",
    handoverNote: "Client link and product-team files live on Brand Handover — not here.",
    openHandover: "Open Brand Handover",
    leftForHandover: "See what's left for handover",
    step1: "Step 1 — Brand identity system",
    step2: "Step 2 — Landing page mockup",
    step3: "Step 3 — Brand deck",
    builtPreview: "Built — open preview",
    previewing: "Previewing",
    building: "Building…",
    notBuilt: "Not built yet",
    channelsTitle: "Channel templates",
    channelsBlurb:
      "Optional SMS, email, ad, and print mockups — same identity and strategy as your core package. Not required for Brand Handover.",
    channelsNeedIdentity: "Choose a Brand Identity System final first.",
    channelsBuild: "Build SMS · email · ads · print",
    channelsBuilding: "Building channel templates…",
    channelsRebuild: "Rebuild channel templates",
    channelsFailed: "Channel template generation failed",
  },
  handover: {
    finish: "Finish",
    title: "Brand Handover",
    blurb:
      "Everything you approved in one place—identity, landing page, and deck. Download files for product teams, present full screen, or share a private client link.",
    checklist: "Package checklist",
    productFiles: "Files for product teams",
    readyDl: " · ready to download",
    afterFinals: " · after finals",
    needed: " · needed",
    shareLine: "Share a client link or download files for product teams",
    shareBrand: "Share brand package",
    sharing: "Sharing…",
    downloadProduct: "Download for product teams",
    buildingPack: "Building pack…",
    copyLink: "Copy client link",
    updateShared: "Update shared package",
    productPackHelp:
      "Product pack = tokens, logo, icons, copy, and a short how-to for building UI.",
    designLocked: "Design Studio is still locked",
    openLogo: "Open Logo Workshop",
  },
  publish: {
    handOff: "Hand off your strategy brief",
    publishBrief: "Publish strategy brief",
    publishing: "Publishing…",
    updateLink: "Update shared link with brand package",
    onlyBrief:
      "Design finals are ready, but this link still shares only the strategy brief.",
    viewBrief: "View the brief",
    unpublish: "Unpublish",
  },
  content: {
    title: "Put the brand to work",
    projectBlurb:
      "Your finished brand becomes a month of posts from your real photos—planned, written, and designed for you to approve.",
    standaloneBlurb:
      "Name the brand, add photos, then build a month of posts you can review and post.",
    lockBrand: "Use brand from this project",
    startBrand: "Start with this brand",
    media: "Raw media",
    mediaBlurb:
      "Tag each photo, skip anything you don't want used, then review fit. Skipped files never enter the month plan.",
    reviewPhotos: "Review photos",
    readyToUse: "Ready to use:",
    poorFitSkip: " · poor fits will be skipped when generating",
    monthBrief: "Month brief",
    briefBlurb:
      "Optional notes for this month — goals, offer, what to avoid, and language. We treat this as the brief for planning posts.",
    generate: "Generate month",
    generateBlurb:
      "We plan the month from your photos, then design each post. This can take several minutes.",
    howOften: "How often",
    photoReuse: "Photo reuse",
    skipPoor: "Skip poor-fit photos",
    buildPosts: "Build this month's posts",
    backBrief: "Back to brief",
    noCalendar: "No calendar yet.",
    generateMonth: "Generate this month",
    nextBrief: "Next: Month brief",
    nextGenerate: "Next: Generate",
    uploadOne: "Upload at least one photo or video to continue.",
    blocked:
      "Approve a logo and choose an identity system in Design Studio first — then you can plan the month (landing and deck help, but they don’t block).",
  },
  projects: {
    continue: "Continue",
    continueWith: "Continue · {label}",
    inProgress: "In progress",
    notStarted: "Not started",
    greenfield: "New brand — no existing materials",
    deleteConfirm: "Can't be undone.",
    deleting: "Deleting…",
  },
  coach: {
    role: "Lighthouse guide",
    talkPlaceholder: "Talk to Faro…",
    footer: "You approve every step — Faro only keeps the light on.",
    thinking: "Faro is thinking",
    error:
      "The weather's rough on the wire. Try again in a moment — or keep going; I'm still here with the map.",
    open: "Talk to Faro",
    hide: "Hide Faro for this session",
    minimize: "Minimize Faro",
    moodCalm: "Steady light",
    moodThinking: "Considering",
    moodEncouraging: "With you",
    moodCareful: "Mind the rocks",
    moodProud: "Well charted",
    pointing: "Pointing here",
    noKeyHint:
      " When you add your strategy AI key in Settings, I can talk with you live — until then, I’ll keep the map steady.",
    openChatAria: "Faro, your guide",
  },
  coachTip: {
    homeTitle: "Glad you're here",
    homeBody:
      "I'm Faro. I'll walk with you from a few plain questions to a brand you can explain — and a package you can hand off. Nothing is final until you say so. Ready when you are.",
    startTitle: "Honest answers",
    startBody:
      "Don't polish these for me. A few true lines beat a perfect essay. I'll turn them into a strategy draft you can read and fix — you're still the author.",
    settingsTitle: "Keeping the light on",
    settingsBody:
      "I need a strategy AI key for writing and design, and a logo AI key for marks. Restart Faro from start.bat if the design helper is asleep — then we can go far.",
    hubTitle: "Your map",
    hubBody:
      "This is home base. Hit Continue for the next real step. The rail is our path: strategy, name, logo, design, handover, then content. One light at a time.",
    strategyTitle: "Does this sound like you?",
    strategyBody:
      "Read the essentials. Change anything that isn't your voice. Apply your edits so the rest can follow — then approve when it feels true, and we'll name the brand.",
    mapTitle: "The deep chart",
    mapBody:
      "This full map is optional. Use it when you want every pillar. Day to day, stick with Continue and the essentials — don't get lost in the fog.",
    nameTitle: "What we call it",
    nameBody:
      "Here we lock the name that goes on the mark. A working title was fine before; now choose what you'll stand behind when the logo ships.",
    logoTitle: "The face of it",
    logoBody:
      "Look at the directions. Keep what feels right, drop the rest. When you approve one mark, Design Studio builds the system around it — not the other way around.",
    designTitle: "System and mockups",
    designBody:
      "Your logo leads. Pick one identity, then build the landing page and deck. When you're ready to share or download, meet me on Brand Handover — that's where the client link lives.",
    handoverTitle: "Safe harbour",
    handoverBody:
      "Everything you approved, in one place. Download files for product teams, present full screen, or share a private client link. This is the handoff — clean and calm.",
    contentTitle: "Out into the weather",
    contentBody:
      "The brand is built. Now we put it to work — a month of posts from your real photos. You still approve what ships. I just keep the light steady.",
    contentSoloTitle: "Content without the full voyage",
    contentSoloBody:
      "We can plan posts from photos here. If you want the full Faro package — strategy through handover — start a project from home. I'll be there either way.",
  },
  explain: {
    /** Deep product knowledge — short, clear, insightful (not filler). */
    k: {
      startBrand: {
        title: "Begin the voyage",
        body: "Opens the six-question interview. Plain answers beat polish — I draft strategy essentials you can edit before anything becomes final.",
      },
      projectsList: {
        title: "Your brand projects",
        body: "Each card is one engagement. Continue jumps to the next unfinished stage — strategy, name, logo, design, handover, or content.",
      },
      language: {
        title: "Interface language",
        body: "Switches chrome, journey labels, and my voice between English and Spanish. Your project content stays as you wrote it.",
      },
      nextStep: {
        title: "Save and advance",
        body: "Locks this answer in the interview and unlocks the next question. You can always step back — nothing here is irreversible.",
      },
      finishDraft: {
        title: "Draft strategy from answers",
        body: "Sends your six answers into strategy AI. You land on Express to review concept, manifesto, and design plan — approve only when it sounds like you.",
      },
      nameField: {
        title: "Working brand name",
        body: "The label for this project file and first drafts. After strategy you’ll confirm the name logos will use — provisional titles are fine here.",
      },
      nameConfirm: {
        title: "Lock the name for logos",
        body: "The mark and Design Studio treat this as the real name. Confirm when you’re ready to stop treating it as a placeholder.",
      },
      approveStrategy: {
        title: "Gate to brand name",
        body: "Marks strategy essentials as owner-approved and unlocks naming. It does not lock a client package yet — that comes after Design Studio finals.",
      },
      applyEdits: {
        title: "Cascade your wording",
        body: "Saves this card and regenerates dependent strategy cards so manifesto and plan follow your edit — not the old draft. Cancel leaves others untouched.",
      },
      continueDrafting: {
        title: "Pick up where drafting stopped",
        body: "Continues the strategy pipeline from the next unfilled section. Already-written cards stay — nothing is wiped. Use after stop, error, or a server restart mid-run.",
      },
      rewriteAi: {
        title: "Polish, don’t replace you",
        body: "Improves clarity of your current draft only. It won’t cascade until you hit Apply my edits — you’re still the author.",
      },
      editCard: {
        title: "Take the pen",
        body: "Opens this strategy card for your words. Edit freely; Apply my edits is what updates the rest of the system.",
      },
      logoGate: {
        title: "Logo Workshop",
        body: "Logo concepts use OpenAI/Gemini — not the Design Studio engine. Approve one mark; identity systems and mockups build from that choice later.",
      },
      designBuild: {
        title: "Identity → applications",
        body: "Pick one Brand Identity System, then build landing page and deck on that system only. Strategy claims stay locked — no invented product promises.",
      },
      handover: {
        title: "Package & client link",
        body: "Final delivery surface: three design finals, product-team files, and share. Design Studio creates; Handover packages and publishes.",
      },
      productPack: {
        title: "Tokens for builders",
        body: "ZIP with design tokens, logos, icons, brand copy, and a short how-to. For engineers/product — separate from the client share link.",
      },
      sharePackage: {
        title: "Private client link",
        body: "Publishes a read-only snapshot. Later edits in Faro don’t change what the client sees until you share again — the shared link stays fixed until you update it.",
      },
      contentMonth: {
        title: "Month of owned media",
        body: "Plans 2–3 posts/week from your photos, then designs each piece with locked brand. Approve what ships — I won’t post for you.",
      },
      reviewPhotos: {
        title: "Media fitness check",
        body: "Tags and fit scores so weak personal shots don’t enter the plan. Exclude what you never want published before you generate.",
      },
      contentStudio: {
        title: "Put the brand to work",
        body: "Stage six: social calendar after the package exists. Needs strategy, logo, and design finals so posts inherit the real system.",
      },
      settings: {
        title: "AI keys stay local",
        body: "Claude for strategy/design, OpenAI or Gemini for logos, design helper via start.bat. Keys never leave this machine.",
      },
      apiKeys: {
        title: "Three separate lanes",
        body: "Strategy text ≠ logo images ≠ Design Studio mockups. Wrong key on a lane fails honestly — we don’t cross engines.",
      },
      continueJourney: {
        title: "Next unfinished stage",
        body: "Uses the six-stage map (strategy → name → logo → design → handover → content). Skips locked steps until prerequisites are done.",
      },
      journeyCurrent: {
        title: "Where attention belongs",
        body: "The journey’s current stage. Finish this before the next gate unlocks — keeps the brand coherent instead of skipping ahead.",
      },
      viability: {
        title: "Brand foundation check",
        body: "Soft gate on business basics once key answers exist. You can proceed with a noted reason — it logs honesty, not a hard wall.",
      },
      fullMap: {
        title: "Optional deep map",
        body: "Every strategy pillar for deep edit. Day-to-day progress still follows Continue and Express essentials — use this when you need the full chart.",
      },
      pathHome: {
        title: "Home harbour",
        body: "Projects, setup health, and the promise: strategy first, then assets. Start a brand or resume Continue on a card.",
      },
      pathStart: {
        title: "Intake interview",
        body: "Six plain questions about offer, story, difference, operations, edge, and taste. Fuel for strategy — not a brand quiz to ace.",
      },
      pathSettings: {
        title: "Setup room",
        body: "Configure the three AI lanes and confirm the design helper. Without keys, long stages can’t run.",
      },
      pathExpress: {
        title: "Strategy essentials",
        body: "Review concept, tensions, manifesto, design plan. Edit → Apply → Approve. Full pillar map is optional noise until essentials feel true.",
      },
      pathName: {
        title: "Name workshop",
        body: "Confirm the name that logos and the package will wear. Strategy can use a working title; this step makes it official.",
      },
      pathLogo: {
        title: "Logo directions",
        body: "Compare proposals, discard noise, approve one. Design Studio will not invent a new mark later — this approval is the hinge.",
      },
      pathDesign: {
        title: "System and mockups",
        body: "Identity system, landing, deck — design helper + Claude only. Choose finals, then leave package/publish to Brand Handover.",
      },
      pathHandover: {
        title: "Safe harbour delivery",
        body: "Checklist of finals, product files, client link. If something’s missing, go back to Design Studio — don’t half-share.",
      },
      pathContent: {
        title: "Content after package",
        body: "Locked brand profile → media → brief → generate → review. Social is step six so the brand is already explainable.",
      },
      pathReview: {
        title: "Pillar-by-pillar review",
        body: "Deep strategy map for one group at a time. Optional if Express essentials already hold; useful when a pillar needs surgery.",
      },
      newProject: {
        title: "New engagement",
        body: "Creates an empty project shell. Prefer Start your brand for the guided interview unless you want to fill sections by hand.",
      },
      delete: {
        title: "Destructive action",
        body: "Removes project data from this machine. Can’t be undone — only click if you mean it.",
      },
      back: {
        title: "Step back",
        body: "Returns to the previous screen without discarding the project. Progress stays saved.",
      },
      preview: {
        title: "Look before you lock",
        body: "Opens a read-only preview of a proposal. Selecting a final is separate — preview doesn’t approve.",
      },
    },
    generic: {
      control:
        "“{label}” — a control on this step of the Faro journey. If it advances work, use it when the previous gate is honestly done; ask me before skipping stages.",
      link: "“{label}” navigates in the brand journey. Follow it when you’re ready for that stage — I’ll reappear with the right context.",
      button:
        "“{label}” triggers an action in Faro. Prefer it when it matches your real next decision; don’t rush gates that need your approval.",
      field:
        "Field “{label}”. This becomes source material for strategy or content — write truthfully; AI drafts from what you put here.",
      heading:
        "“{label}” frames this part of the voyage. Use it as orientation: what this screen must achieve before you leave.",
      checkbox:
        "“{label}” is a project flag. Tick only if true — it can change gates (e.g. greenfield skips audit assumptions).",
    },
  },
};

export const es: Catalog = {
  common: {
    continue: "Continuar",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    back: "Atrás",
    next: "Siguiente",
    loading: "Cargando…",
    error: "Algo salió mal",
    optional: "Opcional",
    yes: "Sí",
    no: "No",
    open: "Abrir",
    close: "Cerrar",
    copy: "Copiar",
    copied: "Copiado",
    download: "Descargar",
    settings: "Ajustes",
    home: "Inicio",
    stages: "etapas",
  },
  nav: {
    contentStudio: "Content Studio",
    settings: "Ajustes",
    allProjects: "Todos los proyectos",
    journey: "Recorrido",
    stages: "Etapas",
    journeyOrder:
      "Mismo orden en cada proyecto: estrategia → nombre → logo → diseño → entrega → contenido.",
    language: "Idioma",
    workspace: "Espacio de trabajo",
  },
  stage: {
    strategy: "Estrategia",
    name: "Nombre de marca",
    logo: "Taller de logo",
    design: "Design Studio",
    handover: "Entrega de marca",
    content: "Content Studio",
  },
  home: {
    startBrand: "Empieza tu marca",
    yourProjects: "Tus proyectos",
    kicker: "Primero la estrategia · luego los activos",
    headline: "Una marca que puedes explicar.",
    lede:
      "La mayoría de herramientas inventan un logo primero. Faro empieza con una estrategia que puedes decir en voz alta — luego nombre, mark, sistema y una entrega limpia. Tú apruebas cada paso.",
    howItWorks: "Cómo funciona",
    howTitle: "De la duda a una dirección que se ve.",
    packageKicker: "El paquete completo",
    packageTitle: "Una marca, no un archivo.",
    packageBlurb:
      "Te llevas una estrategia que puedes explicar, nombre y logo fijados, identidad + landing + deck, y archivos para construir — desde tus respuestas, no un pack de estilo al azar.",
    emptyTitle: "Aún no hay proyectos.",
    emptyBlurb: "Empieza tu primer proyecto de marca—primero la estrategia, luego los activos.",
    workspace: "Espacio de trabajo",
    footerTag: "Primero la estrategia. Luego los activos.",
    step1Title: "Responde con claridad",
    step1Text: "Unas pocas preguntas honestas sobre lo que haces y para quién.",
    step2Title: "Aprueba la estrategia",
    step2Text:
      "Edita hasta que suene a ti. Aprueba cuando sea verdad — luego nombramos y construimos el mark sobre esa base.",
    step3Title: "Entrega limpia",
    step3Text: "Sistema, mockups y archivos que tu diseñador o equipo de producto pueden usar.",
  },
  illustrations: {
    heroHarbour: "Foto de un faro iluminando un puerto al atardecer",
    stepAnswer: "Foto de manos escribiendo en un cuaderno bajo la lámpara",
    stepStrategy: "Foto de notas de estrategia ordenadas con un faro de cerámica",
    stepHandoff: "Foto de manos intercambiando muestras de color y un paquete de marca",
    emptyHarbour: "Foto de un muelle vacío y un faro lejano al amanecer",
    startInterview: "Foto de una mesa de entrevista con té y cuaderno abierto",
    settingsKeys: "Foto de tres llaves en una bandeja junto a un faro pequeño",
    stageStrategy: "Foto de brújula de latón y página de planificación — estrategia",
    stageName: "Foto de placa en blanco y pluma — nombre de marca",
    stageLogo: "Foto de monograma en un caballete — taller de logo",
    stageDesign: "Foto de mockups y chips de color — design studio",
    stageHandover: "Foto de sobre sellado y paquete con lazo — entrega de marca",
    stageContent: "Foto de calendario de contenido y cámara — content studio",
  },
  start: {
    title: "Construyamos tu marca",
    intro:
      "Primero, unas preguntas sencillas. Después, un borrador de estrategia que revisas y corriges—paso a paso. No hace falta experiencia en branding.",
    brandName: "Nombre de la marca",
    brandNameHint:
      "Un título provisional vale. Después del borrador de estrategia podemos proponer un nombre más fuerte antes de los logos.",
    brandNamePh: "p. ej. Finisterra — o un título provisional",
    company: "Empresa / tu nombre (opcional)",
    companyPh: "A quién pertenece esta marca",
    greenfield: "Es una marca nueva, sin logo ni materiales previos.",
    personal: "Es mi propio proyecto — aún no hay un cliente de pago.",
    blank: "¿Prefieres rellenarlo todo tú? Empieza un proyecto en blanco.",
    questionOf: "Pregunta {n} de {total}",
    typeHint: "Unas pocas frases bastan — Siguiente se activa al escribir algo.",
    needName: "Ponle un nombre a tu marca para continuar.",
    finish: "Terminar y crear mi borrador",
    building: "Creando tu borrador de estrategia…",
    draftingTitle: "Redactando tu estrategia…",
    draftingDesc:
      "Estamos convirtiendo tus respuestas en un primer borrador de los cimientos de tu marca. Después lo revisarás paso a paso.",
    stepOf: "Paso {n} de {total}",
    startBtn: "Empezar",
    needAnswer: "Escribe una respuesta breve para continuar.",
    needNameFirst: "Ponle primero un nombre a tu marca.",
    q1Title: "¿Qué vendes y para quién es?",
    q1Help:
      "Describe lo que ofreces de verdad y el tipo de cliente que más se beneficia. Sin pulir — con claridad.",
    q1Ph: "Ayudamos a estudios de arquitectura independientes… Nuestros mejores clientes son…",
    q2Title: "¿Cómo empezó y hacia dónde lo llevas?",
    q2Help:
      "Cómo nació el negocio, lo que marcó tu forma de trabajar y dónde te gustaría estar en unos años.",
    q2Ph: "Empecé esto después de… Aprendí que… En unos años quiero…",
    q3Title: "¿Qué te hace distinto — y qué crees de tu industria?",
    q3Help:
      "Lo que el cliente obtiene contigo y no en otro sitio, y tus convicciones sobre cómo debería funcionar tu sector.",
    q3Ph: "A diferencia de la mayoría… Creo que la industria se equivoca en ___ porque…",
    q4Title: "¿Cómo opera el negocio y dónde aparece la marca?",
    q4Help:
      "Cuántos productos/servicios, nivel de precio, dónde vive la marca (web, Instagram, packaging…) y cómo te encuentran.",
    q4Ph:
      "Tres servicios, precio premium. La marca vive en la web, Instagram y packaging. La mayoría llega por referidos…",
    q5Title: "¿Qué es cierto de ti que un competidor no podría decir con honestidad?",
    q5Help:
      "Lo más difícil de copiar — un estándar, una forma de trabajar, algo que solo tú puedes afirmar.",
    q5Ph: "Nunca hemos entregado una marca en la que no creyéramos…",
    q6Title: "¿Cómo debería verse y sentirse la marca?",
    q6Help:
      "Marcas o estilos que admiras, la sensación que quieres transmitir y lo que no quieres (colores, tonos, clichés).",
    q6Ph:
      "Limpio y calmado, como Aesop o Apple. Cálido pero seguro. Nada de neones ni clichés de startup…",
  },
  settings: {
    title: "Ajustes",
    blurb:
      "Pega tus claves una vez para que Faro escriba estrategia, invente logos y construya tu paquete de diseño. Todo se queda en este ordenador.",
    whatsReady: "Qué está listo",
    whatsReadyBlurb:
      "Faro usa unas pocas claves para escribir estrategia, inventar logos y construir tu paquete de diseño. Solo tienes que pegarlas una vez — se quedan en este ordenador.",
  },
  setup: {
    ready: "IA lista.",
    readyDetail:
      "Estrategia, logo y diseño se ven bien{daemon}. Los pasos largos pueden tardar unos minutos.",
    daemonUp: " · ayudante de diseño activo",
    needed: "Un poco de configuración antes de las etapas de IA",
    strategyOff: "La escritura de estrategia necesita una clave de Claude (Ajustes).",
    logoOff: "El Taller de logo necesita una clave de OpenAI o Gemini (Ajustes).",
    designOff: "Design Studio necesita una clave de Claude y el ayudante de diseño de Faro en marcha.",
    daemonDown: "El ayudante de diseño no está en marcha — inicia Faro con start.bat.",
    footerAfterLink: " y, si hace falta, inicia Faro con start.bat.",
  },
  viability: {
    brandFoundation: "Base de la marca",
    looksSoundNoted: "Sólida (anotado)",
    notChecked: "Aún no revisado",
    notCheckedBlurb: "Esta comprobación se ejecuta sola cuando hay respuestas clave del negocio.",
    pass: "Sólida",
    passBlurb: "Lo básico de este proyecto de marca se ve suficientemente sólido para seguir.",
    caveat: "Sigue con cuidado",
    caveatBlurb: "Puedes continuar, pero hay algunas señales de alerta o huecos suaves.",
    fail: "Requiere atención",
    failBlurb: "Algo fundamental no superó la comprobación. Aún puedes seguir con un motivo breve.",
  },
  express: {
    kicker: "Revisión de estrategia",
    titleSuffix: "— esenciales de estrategia",
    lede:
      "Lee lo esencial. Cambia lo que no suene a ti. Cuando estas tarjetas estén bien, aprueba y sigue al nombre de marca.",
    helper:
      "Edita lo que no suene a ti. Aplica mis ediciones para actualizar tarjetas relacionadas. El mapa completo es opcional.",
    applyEdits: "Aplicar mis ediciones",
    edit: "Editar",
    rewriteAi: "Reescribir con IA",
    approve: "Aprobar estrategia · continuar al nombre",
    reapprove: "Reaprobar · continuar",
    fullMap: "Opcional: abrir el mapa completo de estrategia",
    projectHub: "Centro del proyecto",
    editFirst: "Aplica tus ediciones (o Cancela) en esta tarjeta antes de aprobar.",
    stillUpdating: "Aún se actualizan las tarjetas de estrategia — espera un momento.",
    conceptNote:
      "Nuevo borrador de concepto. Edita si quieres, luego Aplica mis ediciones para que el manifiesto y el plan de diseño sigan esta idea — o prueba otro concepto.",
    applyFollow: "Aplica mis ediciones para actualizar el resto.",
    updating: "Actualizando la estrategia con tu edición",
    rewriting: "Reescribiendo {name}…",
    applying: "Aplicando tu cambio…",
    draftingTitle: "Redactando la estrategia de {name}",
    draftingDesc:
      "Tus respuestas se convierten en una estrategia y plan de diseño completos. Tarda unos minutos — revisarás todo en una página.",
    stoppedTitle: "Redacción de estrategia detenida",
    stoppedDesc:
      "Detuviste la generación. Las secciones ya redactadas se conservan — continúa cuando quieras.",
    pausedTitle: "Redacción de estrategia en pausa",
    pausedDesc:
      "Algo falló a mitad de camino. El progreso se conserva — puedes continuar desde aquí.",
    interruptedTitle: "La redacción se interrumpió",
    interruptedDesc:
      "El servidor se reinició mientras se redactaba la estrategia. Todo lo ya escrito está guardado.",
    failedDefault: "Falló la redacción de estrategia.",
    stoppedDefault: "Generación detenida. Puedes continuar desde donde quedó.",
    continueDrafting: "Continuar redacción",
    resumeDrafting: "Reanudar redacción",
    stopGeneration: "Detener generación",
    stopping: "Deteniendo…",
    stopHint: "Se detiene al terminar la sección actual. El progreso se conserva.",
    sectionsProgress: "{done} de {total} secciones",
  },
  fullPlan: {
    show: "Mostrar mapa completo de estrategia (opcional)",
    hide: "Ocultar mapa completo de estrategia",
    blurb:
      "Mapa completo opcional. El día a día sigue Continuar y el raíl (revisión de estrategia → nombre → logo → diseño).",
  },
  name: {
    title: "Nombre de marca",
    confirm: "Confirmar nombre",
    workshop: "Taller de nombre",
  },
  logo: {
    title: "Taller de logo",
    continueDesign: "Continuar a Design Studio",
    approved: "está aprobado. Continúa cuando quieras.",
  },
  design: {
    title: "Design Studio",
    lede:
      "Tu logo aprobado lidera. Compara tres direcciones de identidad, elige una final y construye la landing y el deck desde ese sistema—atados a tu estrategia, no a la improvisación.",
    setupTitle: "Design Studio necesita una clave de estrategia en Ajustes.",
    setupHint:
      "Pega tu clave de estrategia una vez en Ajustes. El Taller de logo usa otra clave — no este camino.",
    notSetup:
      "Design Studio aún no está configurado. Añade tu clave de estrategia en Ajustes para que el ayudante de diseño pueda correr.",
    daemonDownTitle: "El ayudante de diseño no está en marcha",
    daemonDownHint:
      "Reinicia Faro con start.bat (o start.ps1), espera a que la app esté lista y pulsa Reintentar. Lo ya guardado no se borra.",
    retryHelper: "Reintentar — comprobar ayudante",
    pausedTitle: "Generación de diseño en pausa",
    failedDefault: "Falló la generación de diseño.",
    resumeHint: "El progreso se conserva — continúa cuando el ayudante esté listo.",
    continueGenerating: "Continuar generación",
    needIdentity: "Elige primero un sistema de identidad de marca.",
    identityNext: "Identidad elegida — siguiente: mockups de aplicación",
    buildMockups: "Construir landing y deck",
    visualsReady: "Visuales listos — termina el paquete en Entrega de marca",
    chooseFinals: "Elige tus finales · {n}/3 listos",
    handoverNote: "El enlace de cliente y los archivos para producto están en Entrega de marca — no aquí.",
    openHandover: "Abrir Entrega de marca",
    leftForHandover: "Ver qué falta para la entrega",
    step1: "Paso 1 — Sistema de identidad de marca",
    step2: "Paso 2 — Mockup de landing",
    step3: "Paso 3 — Deck de marca",
    builtPreview: "Listo — abrir vista previa",
    previewing: "Viendo",
    building: "Construyendo…",
    notBuilt: "Aún no construido",
    channelsTitle: "Plantillas de canal",
    channelsBlurb:
      "Opcional: SMS, email, anuncio e impresión — misma identidad y estrategia. No son obligatorias para Entrega de marca.",
    channelsNeedIdentity: "Elige primero un sistema de identidad final.",
    channelsBuild: "Crear SMS · email · ads · impresión",
    channelsBuilding: "Creando plantillas de canal…",
    channelsRebuild: "Reconstruir plantillas de canal",
    channelsFailed: "Falló la generación de plantillas de canal",
  },
  handover: {
    finish: "Cierre",
    title: "Entrega de marca",
    blurb:
      "Todo lo que aprobaste en un solo lugar—identidad, landing y deck. Descarga archivos para equipos de producto, presenta a pantalla completa o comparte un enlace privado.",
    checklist: "Lista del paquete",
    productFiles: "Archivos para equipos de producto",
    readyDl: " · listo para descargar",
    afterFinals: " · después de los finales",
    needed: " · pendiente",
    shareLine: "Comparte un enlace de cliente o descarga archivos para producto",
    shareBrand: "Compartir paquete de marca",
    sharing: "Compartiendo…",
    downloadProduct: "Descargar para equipos de producto",
    buildingPack: "Preparando paquete…",
    copyLink: "Copiar enlace de cliente",
    updateShared: "Actualizar paquete compartido",
    productPackHelp:
      "Paquete de producto = tokens, logo, iconos, copy y una guía breve para construir UI.",
    designLocked: "Design Studio sigue bloqueado",
    openLogo: "Abrir Taller de logo",
  },
  publish: {
    handOff: "Entrega tu brief de estrategia",
    publishBrief: "Publicar brief de estrategia",
    publishing: "Publicando…",
    updateLink: "Actualizar enlace con el paquete de marca",
    onlyBrief:
      "Los finales de diseño están listos, pero este enlace aún solo comparte el brief de estrategia.",
    viewBrief: "Ver el brief",
    unpublish: "Despublicar",
  },
  content: {
    title: "Pon la marca a trabajar",
    projectBlurb:
      "Tu marca terminada se convierte en un mes de publicaciones a partir de tus fotos reales—planificadas, escritas y diseñadas para que apruebes.",
    standaloneBlurb:
      "Nombra la marca, añade fotos y construye un mes de posts que puedas revisar y publicar.",
    lockBrand: "Usar la marca de este proyecto",
    startBrand: "Empezar con esta marca",
    media: "Medios originales",
    mediaBlurb:
      "Etiqueta cada foto, omite lo que no quieras usar y revisa el encaje. Lo omitido no entra en el plan del mes.",
    reviewPhotos: "Revisar fotos",
    readyToUse: "Listas para usar:",
    poorFitSkip: " · los encajes flojos se omitirán al generar",
    monthBrief: "Brief del mes",
    briefBlurb:
      "Notas opcionales de este mes — metas, oferta, lo que evitar y el idioma. Lo usamos como brief para planificar posts.",
    generate: "Generar el mes",
    generateBlurb:
      "Planificamos el mes a partir de tus fotos y luego diseñamos cada post. Puede tardar varios minutos.",
    howOften: "Frecuencia",
    photoReuse: "Reutilizar fotos",
    skipPoor: "Omitir fotos de mal encaje",
    buildPosts: "Crear los posts de este mes",
    backBrief: "Volver al brief",
    noCalendar: "Aún no hay calendario.",
    generateMonth: "Generar este mes",
    nextBrief: "Siguiente: Brief del mes",
    nextGenerate: "Siguiente: Generar",
    uploadOne: "Sube al menos una foto o vídeo para continuar.",
    blocked:
      "Aprueba un logo y elige un sistema de identidad en Design Studio primero — luego puedes planear el mes (landing y deck ayudan, pero no bloquean).",
  },
  projects: {
    continue: "Continuar",
    continueWith: "Continuar · {label}",
    inProgress: "En curso",
    notStarted: "Sin empezar",
    greenfield: "Marca nueva — sin materiales previos",
    deleteConfirm: "No se puede deshacer.",
    deleting: "Eliminando…",
  },
  coach: {
    role: "Guía faro",
    talkPlaceholder: "Habla con Faro…",
    footer: "Tú apruebas cada paso — Faro solo mantiene la luz.",
    thinking: "Faro está pensando",
    error:
      "Hay tormenta en el cable. Intenta en un momento — o sigue; sigo aquí con el mapa.",
    open: "Hablar con Faro",
    hide: "Ocultar a Faro en esta sesión",
    minimize: "Minimizar a Faro",
    moodCalm: "Luz firme",
    moodThinking: "Pensando",
    moodEncouraging: "Contigo",
    moodCareful: "Ojo con las rocas",
    moodProud: "Bien trazado",
    pointing: "Señalas aquí",
    noKeyHint:
      " Cuando añadas tu clave de estrategia en Ajustes, podré hablar contigo en vivo — hasta entonces, mantengo el mapa firme.",
    openChatAria: "Faro, tu guía",
  },
  coachTip: {
    homeTitle: "Me alegra que estés aquí",
    homeBody:
      "Soy Faro. Te acompaño desde unas pocas preguntas hasta una marca que puedas explicar — y un paquete que puedas entregar. Nada es final hasta que lo digas. Cuando quieras.",
    startTitle: "Respuestas honestas",
    startBody:
      "No las pules para mí. Unas líneas verdaderas valen más que un ensayo perfecto. Las convertiré en un borrador de estrategia que lees y corriges — sigues siendo el autor.",
    settingsTitle: "Mantener la luz",
    settingsBody:
      "Necesito una clave de estrategia para escribir y diseñar, y una clave de logo para los marks. Reinicia Faro con start.bat si el ayudante de diseño duerme — luego vamos lejos.",
    hubTitle: "Tu mapa",
    hubBody:
      "Esta es la base. Pulsa Continuar para el siguiente paso real. El raíl es el camino: estrategia, nombre, logo, diseño, entrega y contenido. Una luz a la vez.",
    strategyTitle: "¿Suena a ti?",
    strategyBody:
      "Lee lo esencial. Cambia lo que no sea tu voz. Aplica tus ediciones para que el resto siga — luego aprueba cuando se sienta verdad, y nombramos la marca.",
    mapTitle: "La carta profunda",
    mapBody:
      "Este mapa completo es opcional. Úsalo cuando quieras cada pilar. En el día a día, sigue Continuar y lo esencial — no te pierdas en la niebla.",
    nameTitle: "Cómo lo llamamos",
    nameBody:
      "Aquí fijamos el nombre que va en la marca. Un título provisional valía antes; ahora elige lo que defenderás cuando salga el logo.",
    logoTitle: "La cara de la marca",
    logoBody:
      "Mira las direcciones. Quédate con lo que encaje, suelta el resto. Cuando apruebes una marca, Design Studio construye el sistema a partir de ella — no al revés.",
    designTitle: "Sistema y mockups",
    designBody:
      "Tu logo lidera. Elige una identidad, luego construye la landing y el deck. Cuando quieras compartir o descargar, nos vemos en Entrega de marca — ahí vive el enlace de cliente.",
    handoverTitle: "Puerto seguro",
    handoverBody:
      "Todo lo que aprobaste, en un lugar. Descarga archivos para producto, presenta a pantalla completa o comparte un enlace privado. Esta es la entrega — limpia y calmada.",
    contentTitle: "Salir a la mar",
    contentBody:
      "La marca está hecha. Ahora la ponemos a trabajar — un mes de posts con tus fotos reales. Tú sigues aprobando lo que se publica. Yo mantengo la luz firme.",
    contentSoloTitle: "Contenido sin el viaje completo",
    contentSoloBody:
      "Podemos planear posts con fotos aquí. Si quieres el paquete Faro completo — de estrategia a entrega — empieza un proyecto en inicio. Estaré en ambos casos.",
  },
  explain: {
    k: {
      startBrand: {
        title: "Empieza el viaje",
        body: "Abre la entrevista de seis preguntas. Respuestas claras superan el brillo — redacto esenciales de estrategia que editas antes de que nada sea final.",
      },
      projectsList: {
        title: "Tus proyectos de marca",
        body: "Cada tarjeta es un engagement. Continuar salta a la etapa incompleta — estrategia, nombre, logo, diseño, entrega o contenido.",
      },
      language: {
        title: "Idioma de la interfaz",
        body: "Cambia chrome, etiquetas del recorrido y mi voz entre inglés y español. El contenido del proyecto queda como lo escribiste.",
      },
      nextStep: {
        title: "Guardar y avanzar",
        body: "Fija esta respuesta de la entrevista y desbloquea la siguiente. Siempre puedes volver — nada aquí es irreversible.",
      },
      finishDraft: {
        title: "Borrador de estrategia",
        body: "Envía tus seis respuestas a la IA de estrategia. Llegas a Express para revisar concepto, manifiesto y plan — aprueba solo cuando suene a ti.",
      },
      nameField: {
        title: "Nombre de trabajo",
        body: "Etiqueta del proyecto y primeros borradores. Tras la estrategia confirmarás el nombre que usarán los logos — aquí vale un título provisional.",
      },
      nameConfirm: {
        title: "Nombre para los logos",
        body: "El mark y Design Studio tratan esto como el nombre real. Confirma cuando deje de ser un placeholder.",
      },
      approveStrategy: {
        title: "Puerta al nombre",
        body: "Marca los esenciales como aprobados por ti y desbloquea el nombre. Aún no fija el paquete de cliente — eso viene tras los finales de diseño.",
      },
      applyEdits: {
        title: "Cascada de tu voz",
        body: "Guarda esta tarjeta y regenera las dependientes para que manifiesto y plan sigan tu edición — no el borrador viejo.",
      },
      continueDrafting: {
        title: "Retoma donde se detuvo la redacción",
        body: "Continúa la estrategia desde la siguiente sección vacía. Lo ya escrito se conserva — no se borra nada. Úsalo tras parar, un error, o un reinicio del servidor a mitad de camino.",
      },
      rewriteAi: {
        title: "Pulir, no reemplazarte",
        body: "Mejora la claridad de tu borrador actual. No hace cascada hasta Aplicar mis ediciones — sigues siendo el autor.",
      },
      editCard: {
        title: "Toma el bolígrafo",
        body: "Abre esta tarjeta de estrategia para tus palabras. Edita libre; Aplicar mis ediciones es lo que actualiza el resto.",
      },
      logoGate: {
        title: "Taller de logo",
        body: "Los conceptos usan OpenAI/Gemini — no el motor de Design Studio. Aprueba un mark; el sistema de identidad se construye después desde esa elección.",
      },
      designBuild: {
        title: "Identidad → aplicaciones",
        body: "Elige un sistema de identidad y construye landing y deck solo sobre ese sistema. Las promesas de estrategia quedan fijas — sin inventar claims.",
      },
      handover: {
        title: "Paquete y enlace",
        body: "Superficie de entrega: tres finales de diseño, archivos de producto y share. Design Studio crea; Entrega empaqueta y publica.",
      },
      productPack: {
        title: "Tokens para construir",
        body: "ZIP con tokens, logos, iconos, copy y guía breve. Para ingeniería/producto — distinto del enlace de cliente.",
      },
      sharePackage: {
        title: "Enlace privado",
        body: "Publica un snapshot de solo lectura. Edits posteriores en Faro no cambian lo que ve el cliente hasta que vuelvas a compartir.",
      },
      contentMonth: {
        title: "Mes de medios propios",
        body: "Planifica 2–3 posts/semana con tus fotos y diseña cada pieza con la marca bloqueada. Tú apruebas lo que se publica.",
      },
      reviewPhotos: {
        title: "Encaje de medios",
        body: "Etiquetas y scores para que fotos personales flojas no entren al plan. Excluye lo que nunca quieras publicar antes de generar.",
      },
      contentStudio: {
        title: "La marca a trabajar",
        body: "Etapa seis: calendario social cuando el paquete ya existe. Necesita estrategia, logo y finales de diseño.",
      },
      settings: {
        title: "Claves locales",
        body: "Claude para estrategia/diseño, OpenAI o Gemini para logos, ayudante con start.bat. Las claves no salen de este ordenador.",
      },
      apiKeys: {
        title: "Tres carriles",
        body: "Texto de estrategia ≠ imágenes de logo ≠ mockups de Design Studio. La clave equivocada falla con honestidad — no cruzamos motores.",
      },
      continueJourney: {
        title: "Siguiente etapa abierta",
        body: "Mapa de seis etapas. Omite lo bloqueado hasta cumplir prerequisitos — mantiene la marca coherente.",
      },
      journeyCurrent: {
        title: "Dónde poner atención",
        body: "La etapa actual del recorrido. Ciérrala antes de que se abra la siguiente puerta.",
      },
      viability: {
        title: "Chequeo de base",
        body: "Puerta suave sobre lo básico del negocio. Puedes seguir con un motivo anotado — registra honestidad, no un muro duro.",
      },
      fullMap: {
        title: "Mapa profundo opcional",
        body: "Cada pilar de estrategia. El día a día sigue Continuar y Express — usa esto cuando un pilar necesita cirugía.",
      },
      pathHome: {
        title: "Puerto de inicio",
        body: "Proyectos, salud de setup y la promesa: primero estrategia, luego activos.",
      },
      pathStart: {
        title: "Entrevista de intake",
        body: "Seis preguntas sobre oferta, historia, diferencia, operaciones, edge y gusto. Combustible para estrategia — no un examen.",
      },
      pathSettings: {
        title: "Sala de setup",
        body: "Configura los tres carriles de IA y el ayudante de diseño. Sin claves no corren las etapas largas.",
      },
      pathExpress: {
        title: "Esenciales de estrategia",
        body: "Revisa concepto, tensiones, manifiesto, plan. Edita → Aplica → Aprueba. El mapa de pilares es opcional hasta que lo esencial suene verdad.",
      },
      pathName: {
        title: "Taller de nombre",
        body: "Confirma el nombre que llevarán logos y paquete. La estrategia puede usar un título provisional; aquí se hace oficial.",
      },
      pathLogo: {
        title: "Direcciones de logo",
        body: "Compara, descarta ruido, aprueba uno. Design Studio no inventará otro mark después — esta aprobación es la bisagra.",
      },
      pathDesign: {
        title: "Sistema y mockups",
        body: "Identidad, landing, deck — solo el ayudante de diseño + Claude. Elige finales; empaquetar/publicar es de Entrega de marca.",
      },
      pathHandover: {
        title: "Entrega en puerto seguro",
        body: "Checklist de finales, archivos de producto, enlace. Si falta algo, vuelve a Design Studio — no compartas a medias.",
      },
      pathContent: {
        title: "Contenido tras el paquete",
        body: "Perfil bloqueado → medios → brief → generar → revisar. Lo social es la etapa seis para que la marca ya sea explicable.",
      },
      pathReview: {
        title: "Revisión pilar a pilar",
        body: "Mapa profundo de un grupo. Opcional si Express ya sostiene; útil cuando un pilar necesita trabajo fino.",
      },
      newProject: {
        title: "Nuevo engagement",
        body: "Crea un proyecto vacío. Prefiere Empieza tu marca para la entrevista guiada salvo que quieras rellenar a mano.",
      },
      delete: {
        title: "Acción destructiva",
        body: "Borra datos del proyecto en esta máquina. No se puede deshacer.",
      },
      back: {
        title: "Un paso atrás",
        body: "Vuelve a la pantalla anterior sin borrar el proyecto. El progreso sigue guardado.",
      },
      preview: {
        title: "Mirar antes de fijar",
        body: "Vista de solo lectura de una propuesta. Seleccionar final es otro paso — previsualizar no aprueba.",
      },
    },
    generic: {
      control:
        "«{label}» — un control de esta etapa del viaje Faro. Si avanza trabajo, úsalo cuando la puerta anterior esté hecha con honestidad.",
      link: "«{label}» navega en el recorrido de marca. Síguelo cuando estés listo para esa etapa — reaparezco con el contexto correcto.",
      button:
        "«{label}» dispara una acción en Faro. Prefiérelo cuando coincida con tu decisión real; no apresures puertas que piden tu aprobación.",
      field:
        "Campo «{label}». Esto alimenta estrategia o contenido — escribe con verdad; la IA redacta desde lo que pongas aquí.",
      heading:
        "«{label}» orienta esta parte del viaje. Úsalo como pin: qué debe lograr esta pantalla antes de irte.",
      checkbox:
        "«{label}» es un flag del proyecto. Márcalo solo si es cierto — puede cambiar puertas (p. ej. marca nueva).",
    },
  },
};
