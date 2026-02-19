"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { Suspense, useState } from "react";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signUp, isLoaded, setActive } = useSignUp();
  const email = searchParams.get("email") || "your email";
  const type = searchParams.get("type") || "reset";
  
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !signUp) {
      setError("Verification service is not ready. Please try again.");
      return;
    }

    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Attempt to verify the email with the code
      const result = await signUp.attemptEmailAddressVerification({
        code: code,
      });

      // Check if verification was successful
      if (result.status === "complete") {
        setVerified(true);
        // Set the active session
        if (signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
        }
        // Redirect to home page
        setTimeout(() => {
          window.location.href = "/home";
        }, 1500);
      } else {
        setError("Verification failed. Please check your code and try again.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setLoading(false);
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(clerkError.errors[0]?.message || "Verification failed. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      }
    }
  };

  const handleResend = async () => {
    if (!isLoaded || !signUp) {
      setError("Service is not ready. Please try again.");
      return;
    }

    try {
      setError(null);
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setError(null);
      alert("Verification code has been resent to your email.");
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend code. Please try again.");
    }
  };

  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Email Verified!
          </h1>
          <p className="text-sm text-gray-600">
            Your account has been verified. Redirecting to home...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        {/* Email Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-600"
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
        </div>

        {/* Title */}
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
          Verify your email
        </h1>

        {/* Message */}
        <p className="mb-6 text-center text-sm text-gray-600">
          We&apos;ve sent a verification code to{" "}
          <span className="font-medium text-gray-900">{email}</span>
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="mb-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(value);
              }}
              placeholder="Enter 6-digit code"
              required
              disabled={loading || !isLoaded}
              className="w-full rounded-lg border border-gray-200 py-3 px-4 text-center text-2xl font-mono tracking-widest placeholder:text-gray-400 focus:border-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={!isLoaded || loading || code.length !== 6}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        {/* Resend Code */}
        <div className="mb-6 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={!isLoaded || loading}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Didn&apos;t receive the code? <span className="font-medium">Resend</span>
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
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
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
