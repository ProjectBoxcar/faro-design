const COLOR: Record<string, string> = {
  empty: "var(--border-strong)",
  draft: "var(--warn)",
  complete: "var(--ok)",
  client_submitted: "var(--client)",
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: COLOR[status] ?? COLOR.empty }}
      title={status}
    />
  );
}
