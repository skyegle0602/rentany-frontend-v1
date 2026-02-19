"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
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

  // Check if current route is an auth route
  const isAuthRoute = pathname?.startsWith("/auth");

  // Show sidebar and header only for authenticated users on non-auth routes
  const showSidebar = isLoaded && isSignedIn && !isAuthRoute;

  if (!isLoaded) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (showSidebar) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar - Fixed on left */}
        <Sidebar />

        {/* Main Content Area - Right side with header and footer */}
        <div className="flex-1 ml-64 flex flex-col">
          {/* Header - Top right of main content */}
          <Header />

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

