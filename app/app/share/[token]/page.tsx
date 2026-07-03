import { notFound } from "next/navigation";
import { getProjectByShareToken } from "@/lib/queries";
import { compileBrief, buildMarkdown } from "@/lib/brief";
import { SectionReadout } from "@/components/SectionReadout";
import { BriefDownloadBar } from "@/components/BriefDownloadBar";

export const dynamic = "force-dynamic";

export default async function ShareBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = getProjectByShareToken(token);
  if (!project || !project.share_token) notFound();

  const compiled = compileBrief(project);
  const hasAnything = compiled.some((g) => g.sections.length > 0);
  const markdown = buildMarkdown(project, compiled);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 lg:px-8 lg:py-16 2xl:max-w-4xl">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <div className="mb-5 flex justify-end print:hidden">
          <BriefDownloadBar token={token} markdown={markdown} />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Brand brief
        </p>
        <h1 className="font-serif text-6xl font-medium leading-[1.0] tracking-tight lg:text-7xl">
          {project.name}
        </h1>
        {project.client_name && (
          <p className="mt-3 text-lg text-[var(--muted)]">{project.client_name}</p>
        )}
        <p className="mt-2 text-sm text-[var(--subtle)]">Prepared for the design team.</p>
      </header>

      {!hasAnything ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
          <p className="text-[var(--muted)]">This brief is still being prepared.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {compiled.map((group) =>
            group.sections.length === 0 ? null : (
              <section key={group.heading}>
                <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  {group.heading}
                </h2>
                <div className="space-y-8">
                  {group.sections.map(({ section, value }) => (
                    <article key={section.id}>
                      <h3 className="mb-3 font-serif text-3xl font-medium tracking-tight">
                        {section.name}
                      </h3>
                      <SectionReadout section={section} value={value} />
                    </article>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}

      <footer className="mt-16 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--subtle)] print:hidden">
        Read-only brand brief.
      </footer>
    </main>
  );
}
