"use client";

import LanguageSelector from "@/components/ui/LanguageSelector";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-end h-16 px-4 sm:px-6 lg:px-8">
        {/* Right: Language & Notifications */}
        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications */}
          <NotificationsDropdown />
        </div>
      </div>
    </header>
  );
}

