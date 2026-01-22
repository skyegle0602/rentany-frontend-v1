"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, detectLanguage, supportedLanguages } from './translation';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (keyPath: string) => string;
  supportedLanguages: Array<{ code: string; name: string; flag: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<string>('en'); // Always start with 'en' to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Initialize language after mount to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      // Check localStorage first, then detect from browser
      const savedLang = localStorage.getItem('preferred_language');
      if (savedLang) {
        setLanguage(savedLang);
      } else {
        const detected = detectLanguage();
        setLanguage(detected);
      }
    }
  }, []);

  useEffect(() => {
    // Only run in browser and after mount
    if (isMounted && typeof window !== 'undefined') {
      // Save language preference
      localStorage.setItem('preferred_language', language);
      
      // Set HTML lang attribute for accessibility
      document.documentElement.lang = language;
    }
  }, [language, isMounted]);

  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    const langCode = language as 'en' | 'fr' | 'es' | 'de';
    let result: any = translations[langCode] || translations.en;
    
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        // Fallback to English
        result = translations.en;
        for (const k of keys) {
          if (result && result[k] !== undefined) {
            result = result[k];
          } else {
            return keyPath;
          }
        }
        break;
      }
    }
    
    return typeof result === 'string' ? result : keyPath;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    supportedLanguages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
