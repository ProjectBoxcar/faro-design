import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  apiKeyStatus,
  getProviderConfig,
  designApiKeyStatus,
  getOpenDesignConfig,
} from "@/lib/settings";
import { publicProviderConfig } from "@/lib/settings-public";
import { brandMemoryStats } from "@/lib/brand-memory";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const strategy = {
    ...apiKeyStatus(),
    ...publicProviderConfig(getProviderConfig()),
  };
  const openDesign = {
    ...designApiKeyStatus(),
    ...publicProviderConfig(getOpenDesignConfig()),
  };
  const brandMemory = brandMemoryStats();

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
          API keys for each engine, plus brand memory that improves results as you finish projects.
        </p>
      </header>

      <SettingsForm initial={{ strategy, openDesign, brandMemory }} />
    </main>
  );
}
