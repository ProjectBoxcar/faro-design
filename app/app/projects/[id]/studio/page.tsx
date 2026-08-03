import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Lock, Palette, PenTool, Type, MessageSquareText, Shapes, Camera } from "lucide-react";
import { getProject, listStudioAssets } from "@/lib/queries";
import { studioBlockedReason, clearedName } from "@/lib/studio";
import { needsNameWorkshop } from "@/lib/naming-propose";

export const dynamic = "force-dynamic";

// The Studio hub: one card per Design Plan component. Batch 1 ships the logo
// workspace; the rest are visible but explicitly "not yet" so the map is honest.
export default async function StudioHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  // Soft name gate: only on first entry (no logo work yet). Never trap owners
  // who already generated candidates or approved a mark.
  const hasLogoWork = listStudioAssets(id, "logo").some((a) => a.status !== "discarded");
  if (
    needsNameWorkshop(id) &&
    !studioBlockedReason(id, "logo") &&
    !hasLogoWork
  ) {
    redirect(`/projects/${id}/name`);
  }

  const blocked = studioBlockedReason(id, "logo");
  const name = clearedName(id);
  const logos = listStudioAssets(id, "logo");
  const approved = logos.find((a) => a.status === "approved");
  const chosen = logos.find((a) => a.status === "chosen");
  const live = logos.filter((a) => a.status !== "discarded").length;

  const logoState = approved
    ? { label: `Approved — “${approved.label}”`, tone: "text-[var(--ok)]" }
    : chosen
      ? { label: `Direction chosen — “${chosen.label}”, awaiting your approval`, tone: "text-[var(--accent)]" }
      : live > 0
        ? { label: `${live} candidate${live === 1 ? "" : "s"} to review`, tone: "text-[var(--accent)]" }
        : { label: "Not started", tone: "text-[var(--subtle)]" };

  const upcoming = [
    { icon: Palette, name: "Color palette", note: "tokens + contrast rules" },
    { icon: Type, name: "Typography", note: "families + type scale" },
    { icon: MessageSquareText, name: "Verbal identity", note: "tagline + core copy" },
    { icon: Shapes, name: "Visual elements", note: "patterns + icon starters" },
    { icon: Camera, name: "Photography", note: "art-direction spec" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-12 lg:py-12">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight lg:text-4xl">Logo Workshop</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
          First visual step after strategy: design and approve your logo here. Design Studio comes
          next for color, type, and mockups — it will use this approved mark, not invent a new one.
          The AI proposes candidates and a critic filters weak ones, but{" "}
          <strong className="text-[var(--foreground)]">nothing is final until you approve it</strong>.
        </p>
      </div>

      {blocked ? (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          <Lock size={16} className="mt-0.5 shrink-0" />
          <p>{blocked}</p>
        </div>
      ) : (
        name && (
          <p className="mb-8 text-sm text-[var(--muted)]">
            Designing for: <strong className="text-[var(--foreground)]">{name}</strong>
          </p>
        )
      )}

      <Link
        href={`/projects/${id}/studio/logo`}
        aria-disabled={Boolean(blocked)}
        className={`block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition ${
          blocked ? "pointer-events-none opacity-60" : "hover:border-[var(--border-strong)]"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PenTool size={18} className="text-[var(--accent)]" />
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-tight">Logo</h2>
              <p className={`mt-0.5 text-sm ${logoState.tone}`}>{logoState.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(approved ?? chosen)?.payload?.svg && (
              <div
                className="flex h-12 w-36 items-center justify-center rounded-lg border border-[var(--border)] px-3 py-2 [&_svg]:max-h-full [&_svg]:max-w-full"
                style={{ background: "#F5F1E8" }}
                dangerouslySetInnerHTML={{ __html: (approved ?? chosen)!.payload!.svg! }}
              />
            )}
            <ArrowRight size={18} className="shrink-0 text-[var(--subtle)]" />
          </div>
        </div>
      </Link>

      {approved ? (
        <div className="mt-8 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-6">
          <h3 className="font-serif text-xl font-medium tracking-tight">Logo approved</h3>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Next: Design Studio builds color, typography, components, and mockups around this mark —
            it will not invent a new logo.
          </p>
          <Link
            href={`/projects/${id}/design`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Continue to Design Studio <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
            After the logo
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((u) => (
              <div
                key={u.name}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--subtle)]"
              >
                <u.icon size={16} />
                <span>
                  {u.name} <span className="text-xs">— {u.note}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
