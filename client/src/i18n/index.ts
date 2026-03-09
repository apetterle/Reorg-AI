import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ptBR from "./pt-BR.json";

const savedLanguage = typeof window !== "undefined"
  ? localStorage.getItem("reorg-language") || "en"
  : "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "pt-BR": { translation: ptBR },
    },
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem("reorg-language", lang);
}

export const supportedLanguages = [
  { code: "en", label: "English" },
  { code: "pt-BR", label: "Português (BR)" },
];
