"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Check if user already has intent set
  useEffect(() => {
    async function checkUserIntent() {
      if (!isLoaded || !user) {
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUserData(currentUser);

        // If user already has intent, redirect to home
        if (currentUser?.intent) {
          router.push("/home");
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking user intent:", error);
        setLoading(false);
      }
    }

    checkUserIntent();
  }, [isLoaded, user, router]);

  const handleSelectIntent = async (intent: 'renter' | 'owner' | 'both') => {
    if (saving) return;

    try {
      setSaving(true);

      // Update user intent via API
      const response = await api.updateUser({
        intent,
      });

      console.log("Update intent response:", response);

      // Check if the update was successful
      if (response && response.success !== false) {
        // Redirect to home after successful update
        console.log("Intent updated successfully, redirecting to home...");
        // Use window.location for reliable navigation
        window.location.href = "/home";
      } else {
        console.error("Failed to update intent:", response);
        const errorMessage = response?.error || "Failed to save your selection. Please try again.";
        alert(errorMessage);
        setSaving(false);
      }
    } catch (error) {
      console.error("Error updating intent:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred. Please try again.";
      alert(errorMessage);
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 md:p-12">
            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="mb-3 text-3xl font-bold text-gray-900">
                Welcome to Rentany! 🎉
              </h1>
              <p className="text-lg text-gray-600">
                What do you want to do on Rentany?
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {/* Rent Items Option */}
              <button
                onClick={() => handleSelectIntent('renter')}
                disabled={saving}
                className="w-full rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
                    🧳
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-xl font-semibold text-gray-900">
                      Rent items
                    </h3>
                    <p className="text-sm text-gray-600">
                      Browse and rent items from other users
                    </p>
                  </div>
                </div>
              </button>

              {/* List Items Option */}
              <button
                onClick={() => handleSelectIntent('owner')}
                disabled={saving}
                className="w-full rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">
                    🧑‍💼
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-xl font-semibold text-gray-900">
                      List items
                    </h3>
                    <p className="text-sm text-gray-600">
                      Share your items and earn money
                    </p>
                  </div>
                </div>
              </button>

              {/* Both Option */}
              <button
                onClick={() => handleSelectIntent('both')}
                disabled={saving}
                className="w-full rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">
                    🔄
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-xl font-semibold text-gray-900">
                      Both
                    </h3>
                    <p className="text-sm text-gray-600">
                      Rent items and list your own items
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {saving && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving your selection...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
