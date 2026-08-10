export type AppLocale = "en" | "es";

export const APP_LOCALES: { id: AppLocale; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "es", label: "Español", short: "ES" },
];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "faro-app-locale";
