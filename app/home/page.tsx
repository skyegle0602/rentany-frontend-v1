import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import HomeContent from "./home-content";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/signin");
  }

  // Note: Intent check is done client-side in HomeContent component
  // to avoid blocking server-side rendering with API calls
  return <HomeContent />;
}

