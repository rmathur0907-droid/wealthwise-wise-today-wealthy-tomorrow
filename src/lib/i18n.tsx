import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICTS, EN, LANGUAGES, type LangCode, type TKey } from "./i18n-dict";

const STORAGE_KEY = "ww.lang";

interface I18nValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TKey) => string;
  languageName: string;
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => EN[key],
  languageName: "English",
});

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === "string" && value in DICTS;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLangCode(saved)) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key) => DICTS[lang][key] ?? EN[key],
      languageName: LANGUAGES.find((l) => l.code === lang)?.label ?? "English",
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export { LANGUAGES };
export type { LangCode, TKey };
