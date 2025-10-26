
import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ar' : 'en';
    setLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg font-mono font-bold text-sm text-sky-300 hover:bg-sky-500/20 transition-colors"
      aria-label={`Switch to ${language === 'en' ? 'Arabic' : 'English'}`}
    >
      {language === 'en' ? 'AR' : 'EN'}
    </button>
  );
};

export default LanguageSwitcher;
