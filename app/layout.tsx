import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { LanguageProvider } from '@/components/language/LanguageContext'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rentany',
  description: 'Welcome to Rentany',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          // HIDE ALL MODALS GLOBALLY
          modal: "hidden",
          modalContent: "hidden",
          modalHeader: "hidden",
          modalCloseButton: "hidden",
          modalBackdrop: "hidden",
          // Style your forms
          formButtonPrimary: "!bg-gray-900 !hover:bg-gray-800 !text-white",
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <LanguageProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}