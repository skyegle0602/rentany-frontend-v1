"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useState, Suspense } from "react";

function SetNewPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isLoaded, setActive } = useSignIn();
  const token = searchParams.get("token"); // For backward compatibility with old links
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn) {
      setError("Service is not ready. Please try again.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Check if we're in password reset flow (from Clerk)
      if (signIn.status === "needs_new_password") {
        // Reset password using Clerk
        const result = await signIn.resetPassword({
          password: newPassword,
        });

        // Check if password reset is complete
        if (result.status === "complete") {
          // Set the active session if available
          if (result.createdSessionId) {
            await setActive({ session: result.createdSessionId });
          }
          // Redirect to home since user is now signed in
          router.push("/home");
        } else {
          setError("Password reset failed. Please try again.");
          setLoading(false);
        }
      } else if (token) {
        // Fallback: Use backend API if token is provided (for old links)
        // Note: Password reset endpoints are typically public (use token in body, not Clerk JWT)
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${API_BASE}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, newPassword }),
        });

        const data = await response.json();

        if (response.ok) {
          router.push("/auth/signin?reset=success");
        } else {
          setError(data.error || 'Failed to reset password');
          setLoading(false);
        }
      } else {
        setError("Invalid reset session. Please request a new password reset.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setLoading(false);
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(clerkError.errors[0]?.message || 'Failed to reset password. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
      }
    }
  };

  // Check if we have a valid reset session or token
  const hasValidSession = signIn?.status === "needs_new_password" || token;

  if (!hasValidSession && isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Invalid Reset Link
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/auth/reset-password"
            className="inline-block rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Request New Reset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Set new password
        </h1>

        {/* Subtitle */}
        <p className="mb-6 text-sm text-gray-600">
          Enter your new password for Rentany
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* New Password Input */}
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading || !isLoaded}
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters
            </p>
          </div>

          {/* Confirm New Password Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading || !isLoaded}
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Reset Password Button */}
          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="mb-4 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>

        {/* Back Link */}
        <Link
          href="/auth/signin"
          className="block text-center text-sm text-gray-600 hover:text-gray-900"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function SetNewPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <SetNewPasswordContent />
    </Suspense>
  );
}
