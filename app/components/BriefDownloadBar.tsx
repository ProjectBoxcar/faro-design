"use client";

import { FileDown, Printer } from "lucide-react";
import { CopyMarkdownButton } from "./CopyMarkdownButton";

// Download/print actions for the published brief. PDF uses the browser's print
// dialog (the page has a print stylesheet), which saves as PDF everywhere.
export function BriefDownloadBar({ token, markdown }: { token: string; markdown: string }) {
  const base = `/share/${token}/download`;
  const link =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => window.print()} className={link}>
        <Printer size={13} /> PDF
      </button>
      <a href={`${base}?format=doc`} className={link}>
        <FileDown size={13} /> Word
      </a>
      <a href={`${base}?format=html`} className={link}>
        <FileDown size={13} /> HTML
      </a>
      <a href={`${base}?format=md`} className={link}>
        <FileDown size={13} /> Markdown
      </a>
      <CopyMarkdownButton markdown={markdown} />
    </div>
  );
}
