import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationID from './locales/id/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  id: { translation: translationID },
  en: { translation: translationEN },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'id',
    debug: false,
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
