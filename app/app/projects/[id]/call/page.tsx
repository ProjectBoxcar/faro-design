import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { FaroCallShell } from "@/components/faro-call/FaroCallShell";
import { loadFaroCallContext } from "@/lib/faro-call/load-call-context";
import { LOCALE_STORAGE_KEY, type AppLocale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

function localeFromCookie(raw: string | undefined): AppLocale {
  return raw === "es" ? "es" : "en";
}

export default async function FaroCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const locale = localeFromCookie(jar.get(LOCALE_STORAGE_KEY)?.value);
  const ctx = loadFaroCallContext(id, locale);
  if (!ctx) notFound();

  return <FaroCallShell ctx={ctx} />;
}
