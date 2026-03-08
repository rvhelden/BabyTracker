"use client";

import { createContext, useContext, useMemo } from "react";
import en from "../locales/en.json";
import nl from "../locales/nl.json";

const translations = { en, nl };

function getLang(locale) {
  if (!locale) {
    return "en";
  }
  const code = locale.split("-")[0].toLowerCase();
  return code in translations ? code : "en";
}

function makeT(lang) {
  const dict = translations[lang] || translations.en;
  return function t(key, vars) {
    const parts = key.split(".");
    let value = dict;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== "string") {
      return key;
    }
    if (!vars) {
      return value;
    }
    return value.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  };
}

const LocaleContext = createContext(undefined);

export function LocaleProvider({ locale, children }) {
  const value = useMemo(() => {
    const lang = getLang(locale);
    return { locale: locale || undefined, lang, t: makeT(lang) };
  }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  return ctx?.t ?? makeT("en");
}
