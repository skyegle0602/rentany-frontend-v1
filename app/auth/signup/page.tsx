"use client";

import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !signUp) {
      setError("Authentication service is not ready. Please try again.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Create the user account
      await signUp.create({
        emailAddress: email,
        password: password,
      });

      // After creating, check the status
      const status = signUp.status;

      // If signup is complete, activate session and redirect to onboarding
      if (status === "complete") {
        if (signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
        }
        setLoading(false);
        router.push("/onboarding");
        return;
      }

      // If email verification is required
      if (status === "missing_requirements") {
        // Try to prepare email verification
        try {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setLoading(false);
          router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=verification`);
          return;
        } catch (verifyError) {
          console.error("Verification error:", verifyError);
          // If verification fails, check if we can still proceed
          if (signUp.createdSessionId) {
            try {
              await setActive({ session: signUp.createdSessionId });
              setLoading(false);
              router.push("/onboarding");
              return;
            } catch (e) {
              console.error("Session activation error:", e);
            }
          }
          setLoading(false);
          setError("Account created. Please check your email for verification or try signing in.");
          return;
        }
      }

      // If we have a session ID regardless of status, try to use it
      if (signUp.createdSessionId) {
        try {
          await setActive({ session: signUp.createdSessionId });
          setLoading(false);
          router.push("/onboarding");
          return;
        } catch (activeError) {
          console.error("Error setting active session:", activeError);
        }
      }

      // Fallback
      setLoading(false);
      setError("Account created. Please try signing in to continue.");
    } catch (err: any) {
      console.error("Sign-up error:", err);
      console.error("Error type:", typeof err);
      console.error("Error keys:", err ? Object.keys(err) : "no keys");
      setLoading(false);
      
      // More detailed error handling
      if (err && typeof err === 'object') {
        // Check for Clerk error format
        if ('errors' in err) {
          const clerkError = err as { errors: Array<{ message: string; code?: string; longMessage?: string; meta?: any }> };
          const firstError = clerkError.errors[0];
          const errorMessage = firstError?.longMessage || firstError?.message || "Failed to create account. Please try again.";
          const errorCode = firstError?.code;
          
          // Log the full error for debugging
          console.error("Clerk error details:", {
            message: errorMessage,
            code: errorCode,
            meta: firstError?.meta,
            fullError: clerkError.errors,
            allErrors: clerkError.errors
          });
          
          setError(`${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
        } 
        // Check for other error formats
        else if ('message' in err) {
          console.error("Error with message:", err.message);
          setError(err.message);
        }
        else if ('error' in err) {
          console.error("Error object:", err.error);
          setError(String(err.error));
        }
        else {
          console.error("Unknown error format:", JSON.stringify(err, null, 2));
          setError("Failed to create account. Please check the console for details.");
        }
      } else {
        const errorMsg = err instanceof Error ? err.message : String(err) || "Failed to create account. Please try again.";
        console.error("Unknown error:", err);
        setError(errorMsg);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        {/* Back Link */}
        <Link
          href="/auth/signin"
          className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to sign in
        </Link>

        {/* Title */}
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Create your account
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Clerk CAPTCHA Element - Required for bot protection */}
        <div id="clerk-captcha"></div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
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
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm Password
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
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={!isLoaded || loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
