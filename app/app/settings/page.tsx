import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAiLaneHealthSnapshot } from "@/lib/settings";
import { isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import { brandMemoryStats } from "@/lib/brand-memory";
import { SettingsForm } from "@/components/SettingsForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let daemonUp: boolean | null = null;
  try {
    daemonUp = await isOpenDesignDaemonUp();
  } catch {
    daemonUp = false;
  }
  const setup = getAiLaneHealthSnapshot(daemonUp);
  const brandMemory = brandMemoryStats();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 lg:px-10 lg:py-14 2xl:max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> All projects
        </Link>
        <LanguageSwitcher />
      </div>

      <header className="mt-3 mb-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Paste your keys once so Faro can write strategy, invent logos, and build your design
          package. Everything stays on this computer.
        </p>
      </header>

      <SettingsForm
        initial={{
          lanes: setup.lanes,
          strategy: setup.strategy,
          logo: setup.logo,
          designStudio: setup.designStudio,
          openDesign: setup.openDesign,
          brandMemory,
        }}
      />
    </main>
  );
}
