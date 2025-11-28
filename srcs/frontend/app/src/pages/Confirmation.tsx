import { useTranslation } from "react-i18next";

export default function Confirmation() {
    const { t } = useTranslation();
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-lg text-center">
          <h1 className="text-2xl font-bold text-green-600">{t('confirmation.title')}</h1>
          <p className="mt-4 text-gray-700">{t('confirmation.welcome')}</p>
          <p className="mt-2 text-gray-500 text-sm">{t('confirmation.instructions')}</p>
        </div>
      </div>
    );
  }
  