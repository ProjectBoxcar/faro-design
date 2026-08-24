import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { getProject } from "@/lib/queries";
import {
  hasConfirmedBrandName,
  isGenericBrandName,
  readCachedNameProposals,
} from "@/lib/naming-propose";
import { studioBlockedReason } from "@/lib/studio";
import { NameWorkshop } from "@/components/NameWorkshop";

export const dynamic = "force-dynamic";

export default async function NameWorkshopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const project = getProject(id);
  if (!project) notFound();

  // Name page needs strategy content only — logo kind also blocks on unconfirmed name,
  // so use palette (same content gates, no name confirm).
  const strategyOnlyBlocked = studioBlockedReason(id, "palette");
  if (strategyOnlyBlocked) {
    redirect(`/projects/${id}`);
  }

  const confirmed = hasConfirmedBrandName(id);
  const forceEdit = edit === "1";

  // Confirmed name: show locked summary (re-entry) unless ?edit=1
  if (confirmed && !forceEdit) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-8 lg:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
          Brand name
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-5 py-4">
          <Check size={20} className="mt-0.5 shrink-0 text-[var(--ok)]" />
          <div>
            <p className="text-sm font-medium text-[var(--ok)]">Name confirmed</p>
            <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight">
              {project.name}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Logos and Design Studio use this name. Changing it later may require regenerating
              logo candidates.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/projects/${id}/studio`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Continue to Logo Workshop <ArrowRight size={16} />
          </Link>
          <Link
            href={`/projects/${id}/name?edit=1`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            Change name
          </Link>
        </div>
      </main>
    );
  }

  const candidates = readCachedNameProposals(id);

  return (
    <NameWorkshop
      projectId={id}
      workingName={project.name}
      initialCandidates={candidates}
      isGenericWorkingTitle={isGenericBrandName(project.name)}
    />
  );
}
