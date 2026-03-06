'use client'

import { useAuth } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { Shield, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, getCurrentUser, type UserData } from '@/lib/api-client'

function VerifyIdentityContent() {
  const { isLoaded, isSignedIn } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const from = searchParams.get('from')
  const itemId = searchParams.get('item_id')
  const verifiedParam = searchParams.get('verified')
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stripe hosted flow can return without preserving our query params.
  // Keep a short-lived context in sessionStorage as a fallback.
  const effectiveFrom = (() => {
    if (from) return from
    if (typeof window === 'undefined') return null
    try {
      const raw = window.sessionStorage.getItem('verify_identity_ctx')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { from?: string }
      return parsed?.from || null
    } catch {
      return null
    }
  })()

  const effectiveItemId = (() => {
    if (itemId) return itemId
    if (typeof window === 'undefined') return null
    try {
      const raw = window.sessionStorage.getItem('verify_identity_ctx')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { item_id?: string }
      return parsed?.item_id || null
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!from && !itemId) return
    try {
      window.sessionStorage.setItem(
        'verify_identity_ctx',
        JSON.stringify({ from: from || undefined, item_id: itemId || undefined })
      )
    } catch {
      // ignore storage errors
    }
  }, [from, itemId])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    getCurrentUser()
      .then((u) => setUser(u ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  if (isLoaded && !isSignedIn) {
    router.push('/auth/signin')
    return null
  }

  const kycStatus = (user as any)?.kyc_status ?? 'none'
  const isVerified = kycStatus === 'verified'

  const handleStartVerification = async () => {
    setError(null)
    setStarting(true)
    try {
      // Preserve context (where user came from + which item) so Stripe can return to the right place
      const payload: Record<string, string> = {}
      if (from) payload.from = from
      if (itemId) payload.item_id = itemId

      const res = await api.request<{ url: string | null; client_secret: string | null }>(
        '/stripe/identity/create-session',
        { method: 'POST', body: JSON.stringify(payload) }
      )
      if (!res.success) {
        setError(res.error || 'Failed to start verification')
        setStarting(false)
        return
      }
      const url = res.data?.url ?? (res as any).url
      if (url) {
        window.location.href = url
        return
      }
      const clientSecret = res.data?.client_secret ?? (res as any).client_secret
      if (clientSecret && typeof window !== 'undefined' && (window as any).Stripe) {
        const Stripe = (window as any).Stripe
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        if (publishableKey) {
          const stripe = Stripe(publishableKey)
          if (stripe.verifyIdentity) {
            await stripe.verifyIdentity(clientSecret)
            const returnQuery = new URLSearchParams({ verified: '1' })
            if (from) returnQuery.set('from', from)
            if (itemId) returnQuery.set('item_id', itemId)
            router.push(`/verify-identity?${returnQuery.toString()}`)
            return
          }
        }
      }
      setError('Verification could not be started. Please try again or contact support.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setStarting(false)
    }
  }

  if (verifiedParam === '1') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <CardTitle className="text-xl">Verification submitted</CardTitle>
            </div>
            <CardDescription>
              Your ID and selfie have been submitted. We&apos;ll confirm your verification shortly.
              {from === 'rental-request' && itemId
                ? ' Continue to the item to send your rental request.'
                : ' You can return to the app now; we\'ll update your status when processing is complete.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link
                href={
                  effectiveFrom === 'rental-request' && effectiveItemId
                    ? `/itemdetails?id=${effectiveItemId}`
                    : effectiveFrom === 'rental-request'
                    ? '/home'
                    : '/profile'
                }
              >
                Continue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verifiedParam === '0') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <XCircle className="h-8 w-8" />
              <CardTitle className="text-xl">Verification issue</CardTitle>
            </div>
            <CardDescription>
              There was a problem with your verification. You can try again below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link
                href={
                  effectiveFrom && effectiveItemId
                    ? `/verify-identity?from=${effectiveFrom}&item_id=${effectiveItemId}`
                    : '/verify-identity'
                }
              >
                Try again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-8 w-8" />
            <CardTitle className="text-xl">ID verification</CardTitle>
          </div>
          <CardDescription>
            {from === 'rental-request'
              ? 'This booking requires identity verification before you can send the request.'
              : 'Verify your identity with a document and selfie to access high-value or high-risk rentals.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            We use Stripe Identity to verify your ID and a live selfie. You only need to verify once.
          </p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : isVerified ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">You&apos;re already verified. You can request high-risk rentals.</span>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleStartVerification}
              disabled={starting}
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                'Start verification (ID + selfie)'
              )}
            </Button>
          )}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link
                href={
                  effectiveFrom === 'rental-request' && effectiveItemId
                    ? `/itemdetails?id=${effectiveItemId}`
                    : effectiveFrom === 'rental-request'
                    ? '/home'
                    : '/profile'
                }
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <Button variant="ghost" className="flex-1" asChild>
              <Link href="/profile">Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyIdentityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
        </div>
      }
    >
      <VerifyIdentityContent />
    </Suspense>
  )
}
