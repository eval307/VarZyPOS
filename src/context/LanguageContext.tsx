import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppLanguage, Translations, getTranslation } from '../utils/i18n';

export function getStoredLanguage(): AppLanguage {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('app_language');
      if (saved === 'id' || saved === 'en') {
        return saved;
      }
    }
  } catch {
    // fallback
  }
  return 'id';
}

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'id',
  setLanguage: () => {},
  t: getTranslation('id'),
});

export const LanguageProvider: React.FC<{
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    return getStoredLanguage() || initialLanguage || 'id';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('app_language', lang);
      }
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
