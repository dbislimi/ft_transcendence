import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const value = i18n.language.slice(0, 2);
    return (
        <select
            value={value}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="border rounded px-2 py-1 bg-gray-800 text-white border-gray-600"
            aria-label="Language selector"
        >
            <option value="en">🇺🇸 EN</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="es">🇪🇸 ES</option>
            <option value="ru">🇷🇺 RU</option>
            <option value="ar">🇸🇦 AR</option>
        </select>
    );
}