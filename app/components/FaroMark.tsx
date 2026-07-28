/** Brand pack mark — prefers /brand/logo-mark.svg from the Implement Pack. */
export function FaroMark({
  className = "",
  title = "Faro Design",
}: {
  className?: string;
  title?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-mark.svg"
      alt={title}
      className={`h-8 w-auto object-contain object-left ${className}`}
      width={160}
      height={48}
    />
  );
}
