import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ItemDetailsContent from "./item-details-content";

export default async function ItemDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  // For frontend-only mode, allow viewing items without auth
  // Once backend is integrated, uncomment the auth check below
  // const { userId } = await auth();
  // if (!userId) {
  //   redirect("/auth/signin");
  // }

  const params = await searchParams;
  const itemId = params.id;

  if (!itemId) {
    redirect("/home");
  }

  return <ItemDetailsContent itemId={itemId} />;
}

