import en from "../locales/en.json";
import nl from "../locales/nl.json";

const translations = { en, nl };

function getLang(locale) {
  if (!locale) return "en";
  const code = locale.split("-")[0].toLowerCase();
  return code in translations ? code : "en";
}

export function getT(locale) {
  const lang = getLang(locale);
  const dict = translations[lang] || translations.en;
  return function t(key, vars) {
    const parts = key.split(".");
    let value = dict;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== "string") return key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  };
}
