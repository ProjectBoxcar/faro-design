let meta = #{
    name: "faro-quality-delivery",
    description: "Nine owned fixes, a second pass, eighty checks, then tests — align Faro Design without colliding edits",
    when_to_use: "Implement the Faro quality delivery plan with 100 agents.",
    phases: [
        #{ title: "Implement", detail: "Nine agents, exclusive files" },
        #{ title: "Second pass", detail: "Same nine specs, fix only gaps" },
        #{ title: "Check", detail: "Eighty read-only best-practice checks" },
        #{ title: "Prove", detail: "Run unit tests and write the result" },
    ],
};

fn text_of(v) {
    if type_of(v) == "string" {
        v
    } else {
        ""
    }
}

fn clip(v, n) {
    let t = text_of(v);
    if t.len() > n {
        t.sub_string(0, n)
    } else {
        t
    }
}

let rules = "Product rules you must not change: localhost with no APP_PASSWORD stays open; any other host without APP_PASSWORD stays blocked; approving strategy must not publish a share link; name confirmation stays required before first logos; handover and Content Studio stay locked until the full visual package is selected; do not rewrite logo generation into background jobs; do not add database columns or migrations. ";
rules += "Edit only the files named in your spec. If a fix needs another file, set done=false and say which file. Do not run npm test. Do not start the dev server. Do not reformat unrelated code. Match the surrounding style.";

fn task_prompt(role, title, spec, rules) {
    let p = "You are working on Faro Design at F:/Faro Design. The Next.js app is F:/Faro Design/app. ";
    p += role;
    p += "\nTask: ";
    p += title;
    p += "\n";
    p += rules;
    p += "\nSpec:\n";
    p += spec;
    p += "\nReturn done=true only if the spec is already true in the files after your work. summary is two sentences naming the files. files is a comma-separated list of files you changed, or empty if you changed nothing.";
    p
}

let work_schema = #{
    "type": "object",
    "required": ["done", "summary", "files"],
    "additionalProperties": false,
    "properties": #{
        "done": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "files": #{ "type": "string" },
    },
};

let check_schema = #{
    "type": "object",
    "required": ["verdict", "severity", "finding", "file"],
    "additionalProperties": false,
    "properties": #{
        "verdict": #{ "type": "string" },
        "severity": #{ "type": "string" },
        "finding": #{ "type": "string" },
        "file": #{ "type": "string" },
    },
};

let jobs = [];

jobs.push(#{
    title: "Error screens",
    spec: "Create three client components and nothing else. 1) F:/Faro Design/app/app/error.tsx exports default function receiving error and reset, shows a short paper-background message (colors #F5F1E8 and #111111), a button that calls reset, and a link to /. 2) F:/Faro Design/app/app/global-error.tsx is a client component that renders html and body itself, same recovery, because the root layout may have failed. 3) F:/Faro Design/app/app/projects/[id]/error.tsx same pattern, plus a link back to the project when params.id is available. Use Next.js App Router conventions. Do not import server-only modules. Do not edit layout.tsx.",
});

jobs.push(#{
    title: "SQLite busy timeout",
    spec: "In F:/Faro Design/app/lib/db/index.ts, immediately after the existing sqlite.pragma calls, add sqlite.pragma(\"busy_timeout = 5000\"). Do not change WAL or foreign_keys. Do not open a second connection.",
});

jobs.push(#{
    title: "Intake failure status",
    spec: "In F:/Faro Design/app/app/api/intake/route.ts, the catch around expandIntake currently returns status 200 with filled 0, answersSaved true, and error. Change only that status to 502. Keep projectId, filled 0, answersSaved true, answersFilled, and error. Do not change the 201, 400, or 500 paths. Do not edit the start page. The start page already routes to Express when data.error is set.",
});

jobs.push(#{
    title: "Design helper default",
    spec: "In F:/Faro Design/app/components/DesignStudio.tsx change the default parameter daemonUp = true to daemonUp = false. Change nothing else. Failed design jobs already call setError with job.error. Do not refactor that.",
});

jobs.push(#{
    title: "Spanish on name and Express stages",
    spec: "Wire user-visible English in NameWorkshop and the six Express pipeline labels through lib/i18n/catalog.ts for both en and es. Files you may edit: F:/Faro Design/app/components/NameWorkshop.tsx, F:/Faro Design/app/components/ExpressJourney.tsx, F:/Faro Design/app/lib/i18n/catalog.ts. Use useLocale().t and translate placeholders like {name}. PIPELINE_STAGES is outside the component: store a labelKey and call t(labelKey) in the component that already has useLocale. Add keys express.stageReality, express.stageIdentity, express.stageCommunication, express.stageDocument, express.stageConcept, express.stageDesign. English stays the current sentences. Spanish: Realidad — qué es tu negocio de verdad; Identidad — quién es la marca; Comunicación — cómo habla; Documento estratégico y brief; Concepto de marca y manifiesto; Plan de diseño. Name workshop keys under name.* covering the kicker, title, both intro paragraphs, suggest title and body, button labels, the custom-name label and placeholder, keep-name buttons, saving/suggesting/continuing, and Back to strategy review. Keep data-faro-anchor values unchanged. Do not translate candidate names returned by the API.",
});

jobs.push(#{
    title: "Remove unused portrait map",
    spec: "In F:/Faro Design/app/lib/faro-persona.ts remove FARO_FACE, FARO_FACE_DEFAULT, and faceForMood. Keep moods, mood labels, moodForStage, and the SVG-related exports. Replace the mojibake sequences (capital gamma, capital C cedilla, em-dash lookalikes) in comments and personality strings with plain ASCII hyphens or the word 'and'. Update F:/Faro Design/app/lib/__tests__/faro-persona.test.ts so it no longer imports faceForMood or expects jpg paths. Do not delete image files. Do not change FaroPersona.tsx.",
});

jobs.push(#{
    title: "Backup media and restore",
    spec: "Update F:/Faro Design/app/scripts/backup.ts so after the sqlite backup, if data/content-studio exists, copy it to data/backups/content-studio-<same stamp>/ with fs.cpSync recursive. Prune those directories with the same KEEP=14 rule as db files. Add F:/Faro Design/app/scripts/restore.ts. It takes one argument: the basename of a brand-*.db file inside data/backups, never a path with slashes. Refuse anything else. Tell the operator to stop the server. Restore with better-sqlite3 backup API into data/brand.db. If data/backups/content-studio-<stamp> exists for that same stamp, replace data/content-studio with that copy. Add npm script backup:restore = tsx scripts/restore.ts in F:/Faro Design/app/package.json. Do not change other scripts or dependencies.",
});

jobs.push(#{
    title: "Reject Claude key in the OpenAI field",
    spec: "Do not add a database column. In F:/Faro Design/app/app/api/settings/route.ts, if the posted designApiKey trims to a value starting with sk-ant, return 400 and do not save. Error text: That is a Claude key. Paste it in the Claude field. The OpenAI field is only for logo generation. In F:/Faro Design/app/components/SettingsForm.tsx, if the OpenAI input starts with sk-ant, show that same error and do not POST. Do not change getLogoApiConfig, getOpenDesignDaemonKey, or existing saved keys. Do not edit lib/settings.ts.",
});

jobs.push(#{
    title: "Pure access decision",
    spec: "In F:/Faro Design/app/lib/auth.ts add decideAccess({ hasPassword, local, cookieOk }) returning exactly one of block-no-password, local-open, allow, local-mint, need-unlock. Rules in order: no password and not local -> block-no-password; no password and local -> local-open; cookieOk -> allow; local -> local-mint; else need-unlock. In F:/Faro Design/app/proxy.ts use decideAccess and keep the current responses: 503 JSON for /api and the HTML page for pages when blocked; NextResponse.next when local-open or allow; mint the cookie only on local-mint; redirect to /unlock on need-unlock. Do not change the matcher. Extend F:/Faro Design/app/lib/__tests__/auth.test.ts with one assertion per outcome. Do not block localhost.",
});

if jobs.len() != 9 {
    log("expected 9 implement jobs, found " + jobs.len().to_string());
    pause("verification", "Delivery roster is not 9 owned fixes.");
}

phase("Implement");
log("Implementing 9 owned fixes");
let implement_jobs = [];
for j in jobs {
    implement_jobs.push(#{
        prompt: task_prompt("You are the implementer. Make the spec true. Use read_file before editing.", j.title, j.spec, rules),
        label: "fix:" + j.title,
        capability_mode: "read-write",
        output_schema: work_schema,
    });
}
let implemented = parallel(implement_jobs);

phase("Second pass");
log("Second pass on the same nine specs");
let review_jobs = [];
for j in jobs {
    review_jobs.push(#{
        prompt: task_prompt("You are the second pass. Read the files. If the spec is already met, change nothing. If it is not, implement the spec. Do not refactor working code.", j.title, j.spec, rules),
        label: "recheck:" + j.title,
        capability_mode: "read-write",
        output_schema: work_schema,
    });
}
let reviewed = parallel(review_jobs);

let work_log = "";
let wi = 0;
for j in jobs {
    work_log += "# " + j.title + "\n";
    let a = implemented[wi];
    let b = reviewed[wi];
    if a != () && a.success == true && a.output != () {
        work_log += "implement done=" + clip(a.output.done, 8) + " " + clip(a.output.summary, 400) + "\n";
    } else {
        work_log += "implement: no report\n";
    }
    if b != () && b.success == true && b.output != () {
        work_log += "second done=" + clip(b.output.done, 8) + " " + clip(b.output.summary, 400) + "\n";
    } else {
        work_log += "second: no report\n";
    }
    work_log += "\n";
    wi += 1;
}

phase("Check");
let checks = [];
checks.push(#{ title: "Error screen exists", focus: "F:/Faro Design/app/app/error.tsx", q: "Does a client error screen exist with a reset action and a link home?" });
checks.push(#{ title: "Root error screen", focus: "F:/Faro Design/app/app/global-error.tsx", q: "Does global-error render its own html and body?" });
checks.push(#{ title: "Project error screen", focus: "F:/Faro Design/app/app/projects/[id]/error.tsx", q: "Does the project segment have its own error screen?" });
checks.push(#{ title: "Busy timeout", focus: "F:/Faro Design/app/lib/db/index.ts", q: "Is busy_timeout set to 5000 without removing WAL?" });
checks.push(#{ title: "Intake 502", focus: "F:/Faro Design/app/app/api/intake/route.ts", q: "Does expandIntake failure return 502 while still sending projectId and answersSaved true? The missing-key path must stay 201." });
checks.push(#{ title: "Daemon default", focus: "F:/Faro Design/app/components/DesignStudio.tsx", q: "Does daemonUp default to false, while the design page still passes the real value?" });
checks.push(#{ title: "Name translations", focus: "F:/Faro Design/app/components/NameWorkshop.tsx", q: "Does NameWorkshop use t() for its visible chrome, with both en and es keys in catalog.ts?" });
checks.push(#{ title: "Express stage translations", focus: "F:/Faro Design/app/components/ExpressJourney.tsx", q: "Are the six pipeline stage labels translation keys rather than hardcoded English?" });
checks.push(#{ title: "Portrait map removed", focus: "F:/Faro Design/app/lib/faro-persona.ts", q: "Are FARO_FACE and faceForMood gone, and do personality strings no longer contain mojibake?" });
checks.push(#{ title: "Persona tests", focus: "F:/Faro Design/app/lib/__tests__/faro-persona.test.ts", q: "Do persona tests avoid faceForMood and jpg paths?" });
checks.push(#{ title: "Restore script", focus: "F:/Faro Design/app/scripts/restore.ts", q: "Does restore accept only a basename inside data/backups and refuse paths with slashes?" });
checks.push(#{ title: "Media backup", focus: "F:/Faro Design/app/scripts/backup.ts", q: "Does backup copy data/content-studio when that folder exists, and prune old copies?" });
checks.push(#{ title: "Claude key rejected", focus: "F:/Faro Design/app/app/api/settings/route.ts", q: "Does a designApiKey starting with sk-ant return 400 without saving?" });
checks.push(#{ title: "Access helper", focus: "F:/Faro Design/app/lib/auth.ts", q: "Does decideAccess keep localhost-without-password open and block every other host without a password?" });
checks.push(#{ title: "Proxy uses helper", focus: "F:/Faro Design/app/proxy.ts", q: "Does the proxy use decideAccess without shrinking the public share matcher?" });
checks.push(#{ title: "Approve does not publish", focus: "F:/Faro Design/app/app/api/projects/[id]/express/route.ts", q: "Confirm approve still does not call publishProject. verdict pass if it does not." });
checks.push(#{ title: "Name gate", focus: "F:/Faro Design/app/lib/naming-propose.ts", q: "Confirm needsNameWorkshop stays true until the owner confirms. verdict pass if so." });
checks.push(#{ title: "Handover gate", focus: "F:/Faro Design/app/lib/sidebar-journey.ts", q: "Confirm handover unlocks only when design is fully done, not merely when Design Studio opens." });
checks.push(#{ title: "Content gate", focus: "F:/Faro Design/app/lib/content-studio/gates.ts", q: "Confirm Content Studio stays locked until the full package. Do not call that a defect." });
checks.push(#{ title: "Logo contract", focus: "F:/Faro Design/app/app/api/studio/route.ts", q: "Confirm logo generate still awaits generateLogoCandidates and still returns errors to the client. A background rewrite was out of scope. verdict pass if the await remains." });
checks.push(#{ title: "Design resume", focus: "F:/Faro Design/app/lib/design-jobs.ts", q: "Confirm landed design assets are not wiped when a job resumes." });
checks.push(#{ title: "Share still public", focus: "F:/Faro Design/app/proxy.ts", q: "Confirm /share/ is still outside the auth matcher." });
checks.push(#{ title: "Settings key leak", focus: "F:/Faro Design/app/lib/settings.ts", q: "Confirm getAiLaneHealthSnapshot does not put the raw API key in the object returned to the client." });
checks.push(#{ title: "Publish route", focus: "F:/Faro Design/app/app/api/publish/route.ts", q: "Confirm share tokens are still minted only here, with nanoid, not from a short guessable id." });
checks.push(#{ title: "Download names", focus: "F:/Faro Design/app/lib/download-name.ts", q: "Confirm export filenames cannot include path separators." });
checks.push(#{ title: "SQL parameters", focus: "F:/Faro Design/app/lib/queries.ts", q: "Look for string-built SQL that interpolates user input. verdict fail only if you find one." });
checks.push(#{ title: "Express persist", focus: "F:/Faro Design/app/lib/express.ts", q: "Confirm a cancelled or interrupted express run is persisted and not auto-restarted blindly." });
checks.push(#{ title: "JSON parse", focus: "F:/Faro Design/app/lib/json.ts", q: "Confirm corrupt JSON does not throw out of the helper used by project reads." });
checks.push(#{ title: "Upload limits", focus: "F:/Faro Design/app/app/api/content-studio/media/route.ts", q: "Are upload size and type limited? verdict fail if a file of any size and type is stored and served as HTML." });
checks.push(#{ title: "Focus visible", focus: "F:/Faro Design/app/app/globals.css", q: "Is there a global :focus-visible rule?" });
checks.push(#{ title: "Reduced motion", focus: "F:/Faro Design/app/app/globals.css", q: "Is prefers-reduced-motion handled for the main animations?" });
checks.push(#{ title: "Form labels", focus: "F:/Faro Design/app/components/SettingsForm.tsx", q: "Do the key fields have real label elements?" });
checks.push(#{ title: "Icon button names", focus: "F:/Faro Design/app/components/ProjectSidebar.tsx", q: "Are icon-only controls named for assistive tech?" });
checks.push(#{ title: "Mobile bar", focus: "F:/Faro Design/app/components/ProjectMobileBar.tsx", q: "Can a narrow screen reach journey stages without the sidebar covering the work?" });
checks.push(#{ title: "Empty projects", focus: "F:/Faro Design/app/components/ProjectList.tsx", q: "Does the empty project list tell the owner how to start?" });
checks.push(#{ title: "Setup banner", focus: "F:/Faro Design/app/components/SetupReadinessBanner.tsx", q: "Does home explain a missing key or a down design helper?" });
checks.push(#{ title: "Section save", focus: "F:/Faro Design/app/components/SectionEditor.tsx", q: "Can a failed section save be seen by the owner, or does it fail silently?" });
checks.push(#{ title: "Delete confirm", focus: "F:/Faro Design/app/components/DeleteProjectButton.tsx", q: "Does delete ask for confirmation before destroying a project?" });
checks.push(#{ title: "Viability override", focus: "F:/Faro Design/app/lib/viability.ts", q: "Can a fail be overridden only with a note, not by a silent click?" });
checks.push(#{ title: "Guide lines", focus: "F:/Faro Design/app/components/ExpressJourney.tsx", q: "Do express cards still show sectionGuide takeaway or whatItIs?" });
checks.push(#{ title: "Call without speech", focus: "F:/Faro Design/app/lib/faro-call/speech.ts", q: "Does call mode have a path when speech synthesis is missing?" });
checks.push(#{ title: "i18n fallback", focus: "F:/Faro Design/app/lib/i18n/messages.ts", q: "Does a missing Spanish key fall back to English rather than throwing?" });
checks.push(#{ title: "Start page errors", focus: "F:/Faro Design/app/app/start/page.tsx", q: "Does start still show an intake error instead of pretending a failed draft succeeded?" });
checks.push(#{ title: "Client boundaries", focus: "F:/Faro Design/app/app/layout.tsx", q: "Is the root layout a server component, not marked use client?" });
checks.push(#{ title: "Generate timeout", focus: "F:/Faro Design/app/lib/ai.ts", q: "Does the AI client bound how long a provider call can hang?" });
checks.push(#{ title: "AI failure copy", focus: "F:/Faro Design/app/lib/ai-failure.ts", q: "Are provider failures mapped to owner language rather than a raw stack?" });
checks.push(#{ title: "Open Design down", focus: "F:/Faro Design/app/app/projects/[id]/design/page.tsx", q: "Does the design page pass a real daemonUp value into DesignStudio?" });
checks.push(#{ title: "Job error visible", focus: "F:/Faro Design/app/components/DesignStudio.tsx", q: "When a design job status is failed, is job.error shown?" });
checks.push(#{ title: "Logo error visible", focus: "F:/Faro Design/app/components/StudioLogoWorkspace.tsx", q: "When /api/studio returns not ok, is the error shown?" });
checks.push(#{ title: "Logo cancel", focus: "F:/Faro Design/app/lib/studio.ts", q: "Does cancelLogoGeneration still exist and stop the in-flight run?" });
checks.push(#{ title: "Logo name gate", focus: "F:/Faro Design/app/lib/studio.ts", q: "Does studioBlockedReason still block first logo generate until the name is confirmed?" });
checks.push(#{ title: "Design validation", focus: "F:/Faro Design/app/lib/design-validation.ts", q: "Is empty or non-HTML design output rejected?" });
checks.push(#{ title: "Publish snapshot", focus: "F:/Faro Design/app/lib/publish-snapshot.ts", q: "Does publish freeze a snapshot rather than letting the share page read live drafts?" });
checks.push(#{ title: "Share isolation", focus: "F:/Faro Design/app/app/share/[token]/page.tsx", q: "Does the share page avoid owner navigation and other projects?" });
checks.push(#{ title: "Package kinds", focus: "F:/Faro Design/app/app/api/projects/[id]/package/[kind]/route.ts", q: "Does an unknown package kind return 404 rather than an empty 200?" });
checks.push(#{ title: "Lifecycle phase", focus: "F:/Faro Design/app/lib/project-lifecycle.ts", q: "Does approve move phase to planning, and finished only after the package is actually ready?" });
checks.push(#{ title: "Migrate on start", focus: "F:/Faro Design/start.ps1", q: "Does start.ps1 always run db:migrate and stop if it fails?" });
checks.push(#{ title: "Strict TypeScript", focus: "F:/Faro Design/app/tsconfig.json", q: "Is strict true?" });
checks.push(#{ title: "Tests present", focus: "F:/Faro Design/app/lib/__tests__/design-job-resume.test.ts", q: "Do resume tests still assert landed assets are kept?" });
checks.push(#{ title: "Auth tests", focus: "F:/Faro Design/app/lib/__tests__/auth.test.ts", q: "Do tests cover a non-localhost host with no password as blocked?" });
checks.push(#{ title: "No any on auth", focus: "F:/Faro Design/app/lib/auth.ts", q: "Is the new decideAccess function free of any and ts-ignore?" });
checks.push(#{ title: "Error screen contrast", focus: "F:/Faro Design/app/app/error.tsx", q: "Is error text dark on the paper background, not gray on gray?" });
checks.push(#{ title: "Global error recovery", focus: "F:/Faro Design/app/app/global-error.tsx", q: "Can the owner recover without reading a stack trace?" });
checks.push(#{ title: "Intake answers first", focus: "F:/Faro Design/app/lib/intake.ts", q: "Are raw answers saved before the model is called? Check the route and saveIntakeAnswers." });
checks.push(#{ title: "Viability not a hard studio block on caveat", focus: "F:/Faro Design/app/lib/studio.ts", q: "Does viability caveat still allow the logo workshop, while fail without a note blocks it?" });
checks.push(#{ title: "Brand memory", focus: "F:/Faro Design/app/lib/brand-memory.ts", q: "Is memory excluded for the current project when building a prompt, so a project does not learn from itself mid-run?" });
checks.push(#{ title: "Generation loader cancel", focus: "F:/Faro Design/app/components/DesignGenerationWindow.tsx", q: "Can the owner stop a design generation from this window?" });
checks.push(#{ title: "Express cancel", focus: "F:/Faro Design/app/components/ExpressJourney.tsx", q: "Can the owner cancel a running express draft?" });
checks.push(#{ title: "FFmpeg stays on the server", focus: "F:/Faro Design/app/lib/content-studio/ffmpeg.ts", q: "Is ffmpeg imported only from server code, not from a client component?" });
checks.push(#{ title: "Drizzle journal", focus: "F:/Faro Design/app/drizzle/meta/_journal.json", q: "Did this wave add a migration it was not allowed to add? verdict fail if a new entry appeared for a logo or settings column." });
checks.push(#{ title: "Schema untouched", focus: "F:/Faro Design/app/lib/db/schema.ts", q: "Confirm settings still has a single design_api_key and design_jobs kinds do not include logo." });
checks.push(#{ title: "Package scripts", focus: "F:/Faro Design/app/package.json", q: "Does backup:restore exist, and were unrelated dependencies left unchanged?" });
checks.push(#{ title: "Restore traversal", focus: "F:/Faro Design/app/scripts/restore.ts", q: "Could a basename like .. or a slash escape data/backups?" });
checks.push(#{ title: "Error boundary client", focus: "F:/Faro Design/app/app/error.tsx", q: "Is the file marked use client, as Next requires for error boundaries?" });
checks.push(#{ title: "Spanish catalog shape", focus: "F:/Faro Design/app/lib/i18n/catalog.ts", q: "Do the new name and express keys exist under both en and es?" });
checks.push(#{ title: "Anchors kept", focus: "F:/Faro Design/app/components/NameWorkshop.tsx", q: "Are data-faro-anchor faro-name-primary and faro-name-confirm still present?" });
checks.push(#{ title: "Start still posts answers", focus: "F:/Faro Design/app/app/start/page.tsx", q: "Does build() still POST offering, story, difference, operations, edge, and taste?" });
checks.push(#{ title: "Queries parameterized", focus: "F:/Faro Design/app/lib/db/index.ts", q: "Is there still one shared connection, not a new connection per request?" });
checks.push(#{ title: "Unlock cookie flags", focus: "F:/Faro Design/app/proxy.ts", q: "Is the minted cookie httpOnly, sameSite lax, and path /?" });
checks.push(#{ title: "Timing safe compare", focus: "F:/Faro Design/app/lib/auth.ts", q: "Does cookie compare still use timingSafeEqualHex rather than ==" });

if checks.len() != 80 {
    log("expected 80 checks, found " + checks.len().to_string());
    pause("verification", "The check list is not 80.");
}

log("Running 80 read-only checks");
let check_jobs = [];
for c in checks {
    let cp = "You are a read-only checker for Faro Design at F:/Faro Design. Use read_file or grep. Do not edit files. Do not start servers.\n";
    cp += "Check: " + c.title + "\n";
    cp += "Read first: " + c.focus + "\n";
    cp += "Question: " + c.q + "\n";
    cp += "verdict is pass, fail, or unknown. severity is P0, P1, P2, or none. Use P0 only for a security exposure, data loss, or a main path that cannot finish. finding is one sentence. file is the path you opened. Do not invent a defect to look useful. Pass when the code matches the question.";
    check_jobs.push(#{
        prompt: cp,
        label: "check:" + c.title,
        capability_mode: "read-only",
        output_schema: check_schema,
    });
}
let check_results = parallel(check_jobs);

let check_log = "";
let fails = 0;
let passes = 0;
let ci = 0;
for c in checks {
    let r = check_results[ci];
    check_log += c.title + " | ";
    if r == () || r.success != true || r.output == () {
        check_log += "NO REPORT\n";
    } else {
        let verdict = clip(r.output.verdict, 20);
        if verdict == "fail" {
            fails += 1;
        }
        if verdict == "pass" {
            passes += 1;
        }
        check_log += verdict + " | " + clip(r.output.severity, 8) + " | " + clip(r.output.finding, 300) + " | " + clip(r.output.file, 160) + "\n";
    }
    ci += 1;
}
log(passes.to_string() + " checks passed, " + fails.to_string() + " failed");
let check_path = write_scratch_file("checks.md", check_log);
let work_path = write_scratch_file("work.md", work_log);

phase("Prove");
let tp = "Run the Faro Design unit tests and fix only breakage this delivery caused.\n";
tp += "Working directory is F:/Faro Design/app. Run npm test once.\n";
tp += "If it fails, you may edit only: app/error.tsx, app/global-error.tsx, app/projects/[id]/error.tsx, lib/db/index.ts, app/api/intake/route.ts, components/DesignStudio.tsx, components/NameWorkshop.tsx, components/ExpressJourney.tsx, lib/i18n/catalog.ts, lib/faro-persona.ts, lib/__tests__/faro-persona.test.ts, scripts/backup.ts, scripts/restore.ts, package.json, components/SettingsForm.tsx, app/api/settings/route.ts, lib/auth.ts, proxy.ts, lib/__tests__/auth.test.ts.\n";
tp += "Do not weaken a test to hide a product bug. Do not block localhost without a password. Do not make approve publish. Do not add migrations. Run npm test one more time after any fix.\n";
tp += "Return a short report: first result, what you changed, second result.\n\nImplementer notes:\n";
tp += work_log;
let tested = agent(tp, #{ label: "unit-tests", capability_mode: "execute" });
let test_text = "Tests did not report.";
if tested != () && tested.success == true {
    test_text = clip(tested.output, 4000);
}

let rp = "Write a short owner report in Markdown for Faro Design. Use only the notes below. Do not invent files or results.\n";
rp += "Sections: ## What changed, ## Checks, ## Tests, ## Still not in this wave.\n";
rp += "Still not in this wave is fixed text: resumable logo jobs, and a second stored graphics key, were deliberately not done because they need one owner and a migration.\n";
rp += "Name the failed checks. Do not list every pass.\n\n";
rp += "WORK\n" + work_log + "\nCHECKS\n" + check_log + "\nTESTS\n" + test_text;
let editor = agent(rp, #{ label: "delivery-report", capability_mode: "read-only" });
let report = "Report editor returned nothing.\n\n" + work_log + "\n" + check_log + "\n" + test_text;
if editor != () && editor.success == true && type_of(editor.output) == "string" && editor.output != "" {
    report = editor.output;
}
let report_path = write_scratch_file("delivery.md", report);
complete(#{
    work: work_path,
    checks: check_path,
    report_path: report_path,
    passes: passes,
    fails: fails,
    report: report,
});
