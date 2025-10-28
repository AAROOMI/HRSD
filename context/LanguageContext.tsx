import * as React from 'react';
const { createContext, useState, useContext, useMemo, useEffect } = React;

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<{ en: any, ar: any } | null>(null);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Use fetch, which resolves URLs relative to the main document (index.html)
        const enResponse = await fetch('./locales/en.json');
        const arResponse = await fetch('./locales/ar.json');
        if (!enResponse.ok || !arResponse.ok) {
          throw new Error('Failed to fetch translation files');
        }
        const enData = await enResponse.json();
        const arData = await arResponse.json();
        setTranslations({ en: enData, ar: arData });
      } catch (error) {
        console.error('Error loading translations:', error);
        // Set empty translations to prevent app from crashing, but log the error.
        setTranslations({ en: {}, ar: {} });
      }
    };
    loadTranslations();
  }, []);

  const t = useMemo(() => (key: string, replacements?: { [key: string]: string | number }): string => {
    if (!translations) {
      return key; // Return key as fallback during initial load
    }
      
    const keys = key.split('.');
    let result: any = translations[language];
    
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        return key; // Return the key if translation is not found
      }
    }

    if (typeof result === 'string' && replacements) {
        return Object.entries(replacements).reduce((acc, [placeholder, value]) => {
            return acc.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value));
        }, result);
    }

    return result || key;
  }, [language, translations]);

  // Prevent rendering the app until translations are loaded to avoid FOUC (Flash of Untranslated Content)
  if (!translations) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};