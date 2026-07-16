"use client";

import { Select, SelectItem } from "@carbon/react";
import { useRouter } from "next/navigation";
import { createContext, startTransition, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  Locale,
  Messages,
  SUPPORTED_LOCALES,
  TranslationKey,
  formatLocalizedDate,
  formatLocalizedNumber,
  interpolate,
  messages,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: Messages;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(dictionary: Messages, key: TranslationKey) {
  const result = key.split(".").reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, dictionary);
  return typeof result === "string" ? result : key;
}

export function I18nProvider({ initialLocale = DEFAULT_LOCALE, children }: { initialLocale?: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const dictionary = messages[locale];

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
    document.title = dictionary.brand.name;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = messages[nextLocale].brand.description;
    updateLocale(nextLocale);
    startTransition(() => router.refresh());
  }, [dictionary.brand.name, router]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    dictionary,
    t: (key, values) => interpolate(lookup(dictionary, key), values),
    formatDate: (input, options) => formatLocalizedDate(locale, input, options),
    formatNumber: (input, options) => formatLocalizedNumber(locale, input, options),
  }), [dictionary, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

export function LanguageSwitcher({ className = "", id = "watson-cdi-language" }: { className?: string; id?: string }) {
  const { locale, setLocale, dictionary } = useI18n();
  return (
    <Select
      className={className}
      id={id}
      hideLabel
      labelText={dictionary.language.label}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      aria-label={dictionary.language.label}
    >
      <SelectItem value="en-US" text={dictionary.language.english} />
      <SelectItem value="pt-BR" text={dictionary.language.portuguese} />
    </Select>
  );
}
