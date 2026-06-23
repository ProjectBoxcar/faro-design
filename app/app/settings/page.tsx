import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiKeyStatus } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const status = apiKeyStatus();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 lg:px-10 lg:py-14 2xl:max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} /> All projects
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Connect AI so “Improve with AI” can turn your notes into polished brand content.
        </p>
      </header>

      <SettingsForm initial={status} />
    </main>
  );
}
