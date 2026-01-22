import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RentalHistoryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/signin");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Rental History</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No rental history yet.</p>
      </div>
    </div>
  );
}



