"use client";

import Link from "next/link";
import { useSignIn, useSignUp, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function SignInContent() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { signUp: signUpHook } = useSignUp();
  const { isSignedIn, userId } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn && userId) {
      router.push("/home");
    }
  }, [isSignedIn, userId, router]);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccess(true);
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    }

    // Check for OAuth error in URL parameters
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      // Clear the error from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoaded && !signIn) {
      console.error("SignIn object is not available");
    }
  }, [isLoaded, signIn]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !signIn) {
      setError("Authentication service is not ready. Please try again.");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Attempt to sign in
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      // Check if sign-in is complete
      if (result.status === "complete") {
        // Set the active session
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        // Redirect to SSO callback (handles both new and existing users)
        window.location.href = "/auth/sso-callback";
      } else {
        // Handle additional verification steps if needed
        setError("Sign-in requires additional verification. Please check your email.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      setLoading(false);
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(clerkError.errors[0]?.message || "Failed to sign in. Please try again.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to sign in. Please check your credentials and try again."
        );
      }
    }
  };

  const handleGoogleSignIn = async () => {
    // Check if already signed in
    if (isSignedIn) {
      router.push("/home");
      return;
    }

    if (!isLoaded) {
      setError("Authentication service is not ready. Please try again.");
      return;
    }

    // Use signUp for OAuth - it automatically handles both:
    // - Existing users: Signs them in
    // - New users: Creates account and signs them in
    // This is the recommended approach for OAuth flows
    if (!signUpHook) {
      setError("Authentication service is not available. Please refresh the page.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // Get the current URL for redirect
      const currentUrl = window.location.origin;
      
      // signUp.authenticateWithRedirect handles both sign-in and sign-up automatically
      // The SSO callback will redirect to home
      await signUpHook.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${currentUrl}/auth/sso-callback`,
        redirectUrlComplete: `${currentUrl}/auth/sso-callback`,
      });
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setLoading(false);
      
      // Check if error is because user is already signed in
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: Array<{ message: string; code?: string }> };
        const errorCode = clerkError.errors[0]?.code;
        const errorMessage = clerkError.errors[0]?.message;
        
        if (errorCode === 'session_exists' || errorMessage?.includes('already signed in')) {
          router.push("/home");
          return;
        }
        setError(errorMessage || "Failed to sign in with Google. Please try again.");
      } else if (err instanceof Error) {
        if (err.message.includes('already signed in') || err.message.includes('session')) {
          router.push("/home");
          return;
        }
        setError(`Authentication failed: ${err.message}`);
      } else {
        setError(
          "Failed to sign in with Google. Please check:\n" +
          "1. Google OAuth is enabled in your Clerk Dashboard\n" +
          "2. Sign-ups are allowed in Clerk Settings\n" +
          "3. Your environment variables are set correctly\n" +
          "4. Your domain is configured in Clerk"
        );
      }
    }
  };

  const handleFacebookSignIn = async () => {
    // Check if already signed in
    if (isSignedIn) {
      router.push("/home");
      return;
    }

    if (!isLoaded) {
      setError("Authentication service is not ready. Please try again.");
      return;
    }

    // Use signUp for OAuth - it automatically handles both:
    // - Existing users: Signs them in
    // - New users: Creates account and signs them in
    // This is the recommended approach for OAuth flows
    if (!signUpHook) {
      setError("Authentication service is not available. Please refresh the page.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // Get the current URL for redirect
      const currentUrl = window.location.origin;
      
      // signUp.authenticateWithRedirect handles both sign-in and sign-up automatically
      await signUpHook.authenticateWithRedirect({
        strategy: "oauth_facebook",
        redirectUrl: `${currentUrl}/auth/sso-callback`,
        redirectUrlComplete: `${currentUrl}/home`,
      });
    } catch (err: any) {
      console.error("Facebook sign-in error:", err);
      setLoading(false);
      
      // Check if error is because user is already signed in
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: Array<{ message: string; code?: string }> };
        const errorCode = clerkError.errors[0]?.code;
        const errorMessage = clerkError.errors[0]?.message;
        
        if (errorCode === 'session_exists' || errorMessage?.includes('already signed in')) {
          router.push("/home");
          return;
        }
        setError(errorMessage || "Failed to sign in with Facebook. Please try again.");
      } else if (err instanceof Error) {
        if (err.message.includes('already signed in') || err.message.includes('session')) {
          router.push("/home");
          return;
        }
        setError(`Authentication failed: ${err.message}`);
      } else {
        setError(
          "Failed to sign in with Facebook. Please check:\n" +
          "1. Facebook OAuth is enabled in your Clerk Dashboard\n" +
          "2. Sign-ups are allowed in Clerk Settings\n" +
          "3. Your environment variables are set correctly\n" +
          "4. Your domain is configured in Clerk"
        );
      }
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gray-900 pb-1">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <p className="mt-0.5 text-[10px] font-medium text-white leading-tight">
              Rentable
            </p>
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Welcome to Rentany
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600">
          Sign in to continue
        </p>

        {/* Success Message */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Password reset successfully! You can now sign in with your new password.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Clerk CAPTCHA Element - Required for OAuth sign-ups */}
        <div id="clerk-captcha"></div>

        {/* Social Login Buttons */}
        <div className="mb-6 space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={!isLoaded || loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
          <button
            onClick={handleFacebookSignIn}
            disabled={!isLoaded || loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Facebook
          </button>
        </div>

        {/* Separator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">OR</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn}>
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
                disabled={loading}
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={!isLoaded || loading}
            className="mb-6 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Links */}
        <div className="flex items-center justify-between text-sm">
          <Link
            href="/auth/reset-password"
            className="text-gray-600 hover:text-gray-900"
          >
            Forgot password?
          </Link>
          <Link
            href="/auth/signup"
            className="text-gray-600 hover:text-gray-900"
          >
            Need an account? <span className="font-medium">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

