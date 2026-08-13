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
      "Answer a few plain questions. Get a strategy you can stand behind—then logo, system, and a clean handoff. You approve every step.",
    howItWorks: "How it works",
    howTitle: "From unsure to a direction you can see.",
    packageKicker: "The whole package",
    packageTitle: "A brand, not a file.",
    packageBlurb:
      "You'll work through what a real brand is built on. The app drafts each piece from your answers — you review, edit, and approve.",
    emptyTitle: "No projects yet.",
    emptyBlurb: "Start your first brand project—strategy first, then the assets.",
    workspace: "Workspace",
    footerTag: "Strategy first. Then the assets.",
    step1Title: "Answer plainly",
    step1Text: "A few honest questions about what you do and who it's for.",
    step2Title: "Shape the strategy",
    step2Text: "Review essentials, lock a name, approve a logo direction.",
    step3Title: "Hand off cleanly",
    step3Text: "System, mockups, and files your designer or product team can use.",
    guideKicker: "Your guide",
    guideTitle: "Meet Faro — the light on the journey.",
    guideBlurb:
      "Faro is the lighthouse keeper who stays with you: plain words, one next step, and nothing final until you approve. He docks beside what you’re looking at and explains the real product — not fluff.",
    guideTrait1: "Steady and clear — never hype, never jargon walls",
    guideTrait2: "Strategy first, then the assets you can actually use",
    guideTrait3: "You’re the captain; he keeps the light",
  },
  illustrations: {
    heroHarbour: "Lighthouse beam guiding a calm harbour at dusk",
    stepAnswer: "Hands writing honest answers in a notebook under a desk lamp",
    stepStrategy: "Scattered strategy notes gathering into a clear ordered stack",
    stepHandoff: "Passing a brand package with color samples and a gift box",
    emptyHarbour: "Quiet empty dock and distant lighthouse — a journey not yet started",
    startInterview: "Calm interview table with tea and an open notebook",
    settingsKeys: "Three keys on a tray next to a small lighthouse beacon",
    stageStrategy: "Compass and structure page — strategy stage",
    stageName: "Nameplate and pen — brand name stage",
    stageLogo: "Monogram mark on an easel — logo workshop",
    stageDesign: "UI mockups and color chips — design studio",
    stageHandover: "Sealed envelope and package folder — brand handover",
    stageContent: "Content calendar and camera — content studio",
    faroFull: "Faro the lighthouse keeper standing by the light",
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
    setupTitle: "Design Studio needs a Claude key in Settings → AI setup and Faro's design helper running (start Faro with start.bat).",
    setupHint:
      "If generation fails saying the helper isn't running, restart Faro with start.bat and confirm your Claude key in Settings. Logo Workshop uses a different key — not this path.",
    notSetup:
      "Design Studio isn't set up yet. Add your Claude key in Settings and start Faro with start.bat so the design helper can run. Logo Workshop uses a different key.",
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
      "Finish Logo Workshop and Design Studio finals first — Content Studio uses your locked brand package.",
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
      "I need a Claude key for strategy and design, and OpenAI or Gemini for logos. Start Faro with start.bat so the design helper is awake. Then we can go far.",
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
      "Unas preguntas claras. Una estrategia de la que puedas responder. Logo, sistema y una entrega limpia. Tú apruebas cada paso.",
    howItWorks: "Cómo funciona",
    howTitle: "De la duda a una dirección que se ve.",
    packageKicker: "El paquete completo",
    packageTitle: "Una marca, no un archivo.",
    packageBlurb:
      "Trabajarás lo que una marca real necesita. La app redacta cada pieza a partir de tus respuestas — tú revisas, editas y apruebas.",
    emptyTitle: "Aún no hay proyectos.",
    emptyBlurb: "Empieza tu primer proyecto de marca—primero la estrategia, luego los activos.",
    workspace: "Espacio de trabajo",
    footerTag: "Primero la estrategia. Luego los activos.",
    step1Title: "Responde con claridad",
    step1Text: "Unas pocas preguntas honestas sobre lo que haces y para quién.",
    step2Title: "Da forma a la estrategia",
    step2Text: "Revisa lo esencial, fija un nombre, aprueba una dirección de logo.",
    step3Title: "Entrega limpia",
    step3Text: "Sistema, mockups y archivos que tu diseñador o equipo de producto pueden usar.",
    guideKicker: "Tu guía",
    guideTitle: "Conoce a Faro — la luz del viaje.",
    guideBlurb:
      "Faro es el farero que te acompaña: palabras claras, un siguiente paso, y nada es final hasta que apruebas. Se acerca a lo que miras y explica el producto de verdad — sin relleno.",
    guideTrait1: "Firme y claro — sin hype ni muros de jerga",
    guideTrait2: "Primero la estrategia, luego los activos que sí puedes usar",
    guideTrait3: "Tú eres el capitán; él mantiene la luz",
  },
  illustrations: {
    heroHarbour: "Faro guiando un puerto en calma al atardecer",
    stepAnswer: "Manos escribiendo respuestas honestas en un cuaderno bajo la lámpara",
    stepStrategy: "Notas de estrategia reuniéndose en una pila ordenada",
    stepHandoff: "Entrega de un paquete de marca con muestras de color y un regalo",
    emptyHarbour: "Muelle vacío y faro lejano — un viaje aún por empezar",
    startInterview: "Mesa de entrevista con té y un cuaderno abierto",
    settingsKeys: "Tres llaves en una bandeja junto a un faro pequeño",
    stageStrategy: "Brújula y página de estructura — etapa de estrategia",
    stageName: "Placa y pluma — etapa de nombre",
    stageLogo: "Monograma en un caballete — taller de logo",
    stageDesign: "Mockups y chips de color — design studio",
    stageHandover: "Sobre sellado y carpeta — entrega de marca",
    stageContent: "Calendario de contenido y cámara — content studio",
    faroFull: "Faro el farero junto a la luz",
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
    setupTitle:
      "Design Studio necesita una clave de Claude en Ajustes → IA y el ayudante de diseño de Faro en marcha (inicia Faro con start.bat).",
    setupHint:
      "Si falla diciendo que el ayudante no corre, reinicia Faro con start.bat y confirma tu clave de Claude en Ajustes. El Taller de logo usa otra clave.",
    notSetup:
      "Design Studio aún no está configurado. Añade tu clave de Claude en Ajustes e inicia Faro con start.bat. El Taller de logo usa otra clave.",
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
      "Termina el Taller de logo y los finales de Design Studio primero — Content Studio usa tu paquete de marca bloqueado.",
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
      "Necesito una clave de Claude para estrategia y diseño, y OpenAI o Gemini para logos. Inicia Faro con start.bat para que el ayudante de diseño despierte. Luego vamos lejos.",
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
};
