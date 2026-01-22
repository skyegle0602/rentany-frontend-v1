"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/components/language/LanguageContext";
import { Globe } from "lucide-react";

export default function LanguageSelector() {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current language display info
  const currentLang = supportedLanguages.find((lang) => lang.code === language) || supportedLanguages[0];
  const countryCode = currentLang.code.toUpperCase() === 'EN' ? 'GB' : currentLang.code.toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        <Globe className="h-5 w-5" />
        <span>
          <span className="text-gray-500">{countryCode}</span>{" "}
          <span className="text-gray-900">{currentLang.name}</span>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-yellow-400 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {supportedLanguages.map((lang) => {
              const langCountryCode = lang.code.toUpperCase() === 'EN' ? 'GB' : lang.code.toUpperCase();
              const isSelected = lang.code === language;
              
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-gray-500">{langCountryCode}</span>
                  <span className={isSelected ? "text-blue-700 font-medium" : ""}>
                    {lang.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



