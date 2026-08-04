import type { BrandProfile } from "@/lib/content-studio/types";
import { sanitizeStudioSvg } from "@/lib/studio-svg";

export function BrandProfileStrip({ profile }: { profile: BrandProfile }) {
  const safeLogo = profile.logoSvgPreview
    ? sanitizeStudioSvg(profile.logoSvgPreview)
    : null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
            Locked brand profile
          </p>
          <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight">{profile.brandName}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Source: {profile.source === "project" ? "FARO project package" : "Inferred from footage"} ·{" "}
            {profile.locked ? "Locked" : "Unlocked"}
          </p>
        </div>
        {safeLogo ? (
          <div
            className="flex h-14 w-36 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 [&_svg]:max-h-full [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: safeLogo }}
          />
        ) : null}
      </div>
      {profile.conceptStatement ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{profile.conceptStatement}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {profile.toneOfVoice.slice(0, 6).map((t) => (
          <span
            key={t}
            className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
          >
            {t}
          </span>
        ))}
        {profile.palette.slice(0, 6).map((c) => (
          <span
            key={c.hex + c.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--muted)]"
          >
            <span className="h-3 w-3 rounded-full border border-[var(--border)]" style={{ background: c.hex }} />
            {c.hex}
          </span>
        ))}
      </div>
      {profile.notes ? <p className="mt-3 text-[11px] text-[var(--subtle)]">{profile.notes}</p> : null}
    </div>
  );
}
