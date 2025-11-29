import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded-md hover:bg-gray-100 ${i18n.language === 'en' ? 'font-bold' : ''}`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('cs')}
        className={`px-2 py-1 rounded-md hover:bg-gray-100 ${i18n.language === 'cs' ? 'font-bold' : ''}`}
      >
        CS
      </button>
    </div>
  );
};

export default LanguageSwitcher;