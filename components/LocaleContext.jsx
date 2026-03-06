"use client";

import { createContext, useContext, useMemo } from "react";

const LocaleContext = createContext(undefined);

export function LocaleProvider({ locale, children }) {
  const value = useMemo(() => ({ locale: locale || undefined }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
