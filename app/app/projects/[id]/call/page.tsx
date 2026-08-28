import { notFound } from "next/navigation";
import { FaroCallShell } from "@/components/faro-call/FaroCallShell";
import { loadFaroCallContext } from "@/lib/faro-call/load-call-context";

export const dynamic = "force-dynamic";

export default async function FaroCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = loadFaroCallContext(id);
  if (!ctx) notFound();

  return <FaroCallShell ctx={ctx} />;
}
