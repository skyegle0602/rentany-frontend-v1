"use client";

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { getCurrentUser } from '@/lib/api-client';

export default function SSOCallbackPage() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    // Wait for Clerk to be loaded and user to be authenticated
    if (!isLoaded || !userId || !user || redirected) {
      return;
    }

    // All users can both rent and lend - redirect to home
    // Capability is determined by payment setup, not intent
    setRedirected(true);
    router.push('/home');
  }, [isLoaded, userId, user, router, redirected]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
        <p className="text-gray-600">
          Completing authentication...
        </p>
      </div>
      <AuthenticateWithRedirectCallback
        afterSignInUrl="/auth/sso-callback"
        afterSignUpUrl="/auth/sso-callback"
      />
      {/* Required for sign-up flows - Clerk's bot sign-up protection */}
      <div id="clerk-captcha" />
    </div>
  );
}
