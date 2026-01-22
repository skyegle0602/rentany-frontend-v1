"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Company Information */}
          <div>
            <h2 className="text-2xl font-bold mb-3">Rentany</h2>
            <p className="text-sm text-gray-300">
              Rent anything, from anyone. Your trusted peer-to-peer rental marketplace.
            </p>
          </div>

          {/* Middle Column - Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <nav className="space-y-3">
              <Link
                href="/privacy-policy"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Privacy Policy
              </Link>
              <Link
                href="/terms-and-conditions"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Terms and Conditions
              </Link>
            </nav>
          </div>

          {/* Right Column - Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <a
                href="mailto:support@rentany.com"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                support@rentany.com
              </a>
              <a
                href="mailto:legal@rentany.com"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                legal@rentany.com
              </a>
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          {/* Copyright */}
          <p className="text-center text-sm text-gray-400">
            © 2026 Rentany. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}



