
import React, { createContext, useContext, useState, useEffect } from 'react';
import { resources, Language } from '../translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof resources['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // v2.0 Batch 5: Russian как дефолтный язык (offline-first для русскоязычных пользователей).
  // Сохраняем выбор в localStorage для сохранения между сессиями.
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('cipherlink-lang');
    if (saved === 'en' || saved === 'ru') return saved;
    return 'ru'; // дефолт — русский
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cipherlink-lang', lang);
    console.log(`[PILIGRIM] Language switched to: ${lang}`);
  };

  const t = (key: keyof typeof resources['en']): string => {
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
