
import React, { createContext, useContext, useState, useEffect } from 'react';
import { resources, Language } from '../translations';

interface LanguageContextType {
  language: Language | null;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof resources['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language | null>(() => {
    // Проверка наличия window для избежания ошибок при серверном рендеринге (если есть)
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cipherlink-lang');
        return (saved as Language) || null;
    }
    return null;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cipherlink-lang', lang);
  };

  const t = (key: keyof typeof resources['en']): string => {
    if (!language) return resources['en'][key];
    return resources[language][key] || resources['en'][key];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
