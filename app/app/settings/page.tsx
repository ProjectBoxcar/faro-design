import { getAiLaneHealthSnapshot } from "@/lib/settings";
import { isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import { brandMemoryStats } from "@/lib/brand-memory";
import { SettingsForm } from "@/components/SettingsForm";
import { SettingsHeader } from "@/components/SettingsHeader";

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
    <main className="mx-auto max-w-2xl px-3 py-4 lg:px-5 lg:py-5">
      <SettingsHeader />
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
