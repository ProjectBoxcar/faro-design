"use client";

import { ILLUSTRATIONS, type IllustrationId } from "@/lib/illustrations";
import { useLocale } from "@/components/LocaleProvider";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "hero" | "full";

const SIZE_CLASS: Record<Size, string> = {
  xs: "h-12 w-12",
  sm: "h-16 w-16 sm:h-20 sm:w-20",
  md: "h-28 w-28 sm:h-32 sm:w-32",
  lg: "h-40 w-full max-w-xs sm:h-48",
  xl: "h-48 w-full max-w-md sm:h-56",
  hero: "h-full w-full min-h-[10rem] sm:min-h-[13rem]",
  full: "h-auto w-full",
};

/**
 * Editorial illustration from the Faro brand set.
 * Decorative by default (empty alt when alt is "") — pass altKey via catalog or override.
 */
export function IllustrativeFigure({
  id,
  size = "md",
  className = "",
  imgClassName = "",
  decorative = false,
  rounded = true,
}: {
  id: IllustrationId;
  size?: Size;
  className?: string;
  imgClassName?: string;
  /** When true, alt="" (pure decoration beside existing text) */
  decorative?: boolean;
  rounded?: boolean;
}) {
  const { t } = useLocale();
  const asset = ILLUSTRATIONS[id];
  if (!asset) return null;

  const alt = decorative ? "" : t(asset.altKey);

  return (
    <figure
      className={`relative overflow-hidden bg-[var(--surface-2)] ${
        rounded ? "rounded-[var(--radius-lg)]" : ""
      } ${SIZE_CLASS[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={alt}
        width={asset.width}
        height={asset.height}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover object-center ${imgClassName}`}
        draggable={false}
      />
    </figure>
  );
}

/** Stage thumbnail for journey / package lists */
export function StageIllustration({
  stageId,
  size = "sm",
  className = "",
  decorative = true,
}: {
  stageId: string;
  size?: Size;
  className?: string;
  decorative?: boolean;
}) {
  const map: Record<string, IllustrationId> = {
    strategy: "stageStrategy",
    name: "stageName",
    logo: "stageLogo",
    design: "stageDesign",
    handover: "stageHandover",
    content: "stageContent",
  };
  const id = map[stageId];
  if (!id) return null;
  return (
    <IllustrativeFigure
      id={id}
      size={size}
      className={className}
      decorative={decorative}
    />
  );
}
