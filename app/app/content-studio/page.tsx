import Link from "next/link";
import { ContentStudioWorkspace } from "@/components/content-studio/ContentStudioWorkspace";

export const dynamic = "force-dynamic";

/** Workflow B — Content Studio without a FARO brand project. */
export default function StandaloneContentStudioPage() {
  return (
    <div>
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 lg:px-6">
        <Link href="/" className="text-xs text-[var(--subtle)] underline-offset-2 hover:underline">
          ← All projects
        </Link>
      </div>
      <ContentStudioWorkspace mode="standalone" />
    </div>
  );
}
