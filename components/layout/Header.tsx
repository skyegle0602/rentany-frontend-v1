"use client";

import LanguageSelector from "@/components/ui/LanguageSelector";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";

export default function Header({
  onOpenSidebar,
}: {
  onOpenSidebar?: () => void;
}) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile hamburger */}
        <div className="flex items-center">
          {onOpenSidebar ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50"
              aria-label="Open menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          ) : null}
        </div>

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

