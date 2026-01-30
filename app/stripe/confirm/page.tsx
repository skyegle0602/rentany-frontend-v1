'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, Loader2, AlertCircle, CreditCard } from 'lucide-react'
import { api, getCurrentUser, type UserData } from '@/lib/api-client'

interface StripeStatusData {
  verified: boolean
  details_submitted: boolean
  payouts_enabled: boolean
  status?: string
  requirements?: string[]
  payouts_enabled_stripe?: boolean
}

export default function StripeConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [status, setStatus] = useState<'checking' | 'pending' | 'verified' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)

  useEffect(() => {
    checkStripeStatus()
  }, [])

  const checkStripeStatus = async () => {
    setIsChecking(true)
    setError(null)

    try {
      // Get current user
      const user = await getCurrentUser()
      if (!user) {
        setError('Please sign in to continue')
        setStatus('error')
        setIsChecking(false)
        return
      }
      setCurrentUser(user)

      // Check Stripe account status
      const response = await api.request<StripeStatusData>('/stripe/connect/status')
      
      if (response.success && response.data) {
        const { verified, details_submitted, payouts_enabled } = response.data
        
        if (verified && details_submitted && payouts_enabled) {
          // Already verified - redirect to profile
          setStatus('verified')
          setTimeout(() => {
            router.push('/profile?tab=wallet&verified=true')
          }, 2000)
        } else if (details_submitted) {
          // Details submitted but not fully verified yet
          setStatus('pending')
        } else {
          // Not submitted yet
          setError('Account details not submitted. Please complete the onboarding process.')
          setStatus('error')
        }
      } else {
        setError(response.error || 'Failed to check account status')
        setStatus('error')
      }
    } catch (err) {
      console.error('Error checking Stripe status:', err)
      setError('Failed to check account status. Please try again.')
      setStatus('error')
    } finally {
      setIsChecking(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError(null)

    try {
      // Check status again and verify
      const response = await api.request<StripeStatusData>('/stripe/connect/status')
      
      if (response.success && response.data) {
        const { verified, details_submitted, payouts_enabled } = response.data
        
        if (verified && details_submitted && payouts_enabled) {
          // Successfully verified
          setStatus('verified')
          
          // Reload user data to get updated verification status
          await getCurrentUser()
          
          // Redirect to profile after a short delay
          setTimeout(() => {
            router.push('/profile?tab=wallet&verified=true')
          }, 1500)
        } else {
          setError('Account is not fully connected yet. Please wait a moment and try again.')
          setStatus('pending')
        }
      } else {
        setError(response.error || 'Failed to verify account')
      }
    } catch (err) {
      console.error('Error confirming payment:', err)
      setError('Failed to confirm payment. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleRetry = () => {
    checkStripeStatus()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Payment Account Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isChecking && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Checking your account status...</p>
            </div>
          )}

          {status === 'pending' && !isChecking && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Account Details Submitted</AlertTitle>
                <AlertDescription>
                  Your payment account information has been submitted. Please confirm to complete the verification process.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm & Verify Payment
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                  disabled={isConfirming}
                >
                  Check Status Again
                </Button>
              </div>
            </>
          )}

          {status === 'verified' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">Payment Verified!</h3>
              <p className="text-slate-600 mb-4">Your payment account has been successfully verified.</p>
              <p className="text-sm text-slate-500">Redirecting to your profile...</p>
            </div>
          )}

          {status === 'error' && !isChecking && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || 'An error occurred'}</AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  className="w-full"
                >
                  Try Again
                </Button>

                <Button
                  onClick={() => router.push('/profile?tab=wallet')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Profile
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
