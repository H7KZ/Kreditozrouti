import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded-md bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 ${i18n.resolvedLanguage === 'en' ? 'font-bold' : ''}`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('cs')}
        className={`px-2 py-1 rounded-md bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 ${i18n.resolvedLanguage === 'cs' ? 'font-bold' : ''}`}
      >
        CS
      </button>
    </div>
  );
};

export default LanguageSwitcher;