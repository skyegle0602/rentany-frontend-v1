"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Check if current route is an auth route
  const isAuthRoute = pathname?.startsWith("/auth");

  // Show sidebar and header only for authenticated users on non-auth routes
  const showSidebar = isLoaded && isSignedIn && !isAuthRoute;

  // Close the mobile drawer on navigation
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Escape key closes the mobile drawer
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen]);

  if (!isLoaded) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (showSidebar) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Desktop sidebar */}
        <Sidebar variant="desktop" />

        {/* Mobile sidebar (drawer) */}
        <div
          className={`md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity ${
            isMobileSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
        <Sidebar
          variant="mobile"
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area - Right side with header and footer */}
        <div className="flex-1 md:ml-64 flex flex-col">
          {/* Header - Top right of main content */}
          <Header onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

          {/* Footer - Bottom of main content */}
          <Footer />
        </div>
      </div>
    );
  }

  // For auth routes or unauthenticated users, render without sidebar
  return <div className="min-h-screen">{children}</div>;
}

