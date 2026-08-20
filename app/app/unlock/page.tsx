// Designer unlock for non-localhost devices (e.g. phone over Tailscale).
// Clients never see this — the share link is public and never redirects here.

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; error?: string }>;
}) {
  const { to, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/illustrations/hero-harbour.jpg"
        alt=""
        width={800}
        height={450}
        className="mb-6 w-full rounded-[var(--radius-lg)] border border-[var(--border)] object-cover aspect-[16/10]"
      />
      <h1 className="font-serif text-3xl font-medium tracking-tight">Faro Design</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        This device isn&apos;t unlocked yet. Enter the app password once and you&apos;re set.
      </p>
      <form method="POST" action="/api/unlock" className="mt-6 space-y-3">
        <input type="hidden" name="to" value={to ?? "/"} />
        <input
          type="password"
          name="password"
          autoFocus
          placeholder="App password"
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        />
        {error === "1" && (
          <p className="text-sm text-[var(--danger)]">Wrong password — try again.</p>
        )}
        {error === "rate" && (
          <p className="text-sm text-[var(--danger)]">Too many attempts — wait a few minutes.</p>
        )}
        {error === "config" && (
          <p className="text-sm text-[var(--danger)]">
            Set APP_PASSWORD in app/.env.local, then restart Faro.
          </p>
        )}
        {error && error !== "1" && error !== "rate" && error !== "config" && (
          <p className="text-sm text-[var(--danger)]">Wrong password — try again.</p>
        )}
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}
