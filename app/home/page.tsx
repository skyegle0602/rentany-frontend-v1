import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import HomeContent from "./home-content";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/signin");
  }

  // Wrap in Suspense because HomeContent uses useSearchParams
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

