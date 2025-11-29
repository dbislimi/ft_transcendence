import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json'
import fr from './locales/fr.json'
import es from './locales/es.json'
import ru from './locales/ru.json'
import ar from './locales/ar.json'

const supported = ['en', 'fr', 'es', 'ru', 'ar'] as const;
const saved = sessionStorage.getItem('lang') || '';
const browser = navigator.language.slice(0, 2);
const initial = supported.includes(saved as any) ? saved : supported.includes(browser as any) ? browser : 'fr';

i18n.use(initReactI18next).init({
    resources: { en:{translation:en}, fr:{translation:fr}, es:{translation:es}, ru:{translation:ru}, ar:{translation:ar} },
    lng: initial,
    fallbackLng: 'fr',
    supportedLngs: Array.from(supported),
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
    });

i18n.on('languageChanged', (lng) => {
    sessionStorage.setItem('lang', lng);
    document.documentElement.lang = lng;
});

export default i18n;