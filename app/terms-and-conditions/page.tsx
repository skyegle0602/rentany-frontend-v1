'use client'

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, AlertCircle, Scale, Shield, CreditCard, Ban } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10 text-slate-900" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Terms and Conditions</h1>
              <p className="text-slate-600">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                1. Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <p className="text-slate-700">
                By accessing or using Rentany ("the Platform"), you agree to be bound by these Terms and Conditions. 
                If you do not agree to these terms, please do not use our platform.
              </p>
              <p className="text-slate-700">
                Rentany is a peer-to-peer marketplace that connects individuals who wish to rent items ("Owners") 
                with individuals who wish to borrow items ("Renters"). Rentany acts solely as an intermediary and 
                is not a party to the rental agreements between users.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                2. Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">To use Rentany, you must:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>3. User Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">3.1 Account Registration</h3>
                  <p className="text-slate-700">
                    You must create an account to use Rentany. You are responsible for maintaining the confidentiality 
                    of your account information and for all activities that occur under your account.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">3.2 Identity Verification</h3>
                  <p className="text-slate-700">
                    We may require identity verification through our trusted partner Stripe Identity. 
                    Verified users may receive enhanced trust badges and access to additional features.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">3.3 Account Suspension</h3>
                  <p className="text-slate-700">
                    We reserve the right to suspend or terminate accounts that violate these terms, 
                    engage in fraudulent activity, or pose a risk to other users.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>4. Listing and Renting Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.1 Owner Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>Provide accurate descriptions and photos of items</li>
                    <li>Ensure items are in the condition described</li>
                    <li>Set fair and competitive pricing</li>
                    <li>Respond promptly to rental requests</li>
                    <li>Ensure items are safe and legal to rent</li>
                    <li>Maintain appropriate insurance for high-value items</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.2 Renter Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>Treat rented items with care</li>
                    <li>Return items in the same condition</li>
                    <li>Return items on time</li>
                    <li>Pay all fees promptly</li>
                    <li>Report any damage immediately</li>
                    <li>Use items only for their intended purpose</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.3 Prohibited Items</h3>
                  <p className="text-slate-700 mb-2">The following items may not be listed:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>Illegal items or items that promote illegal activity</li>
                    <li>Weapons, firearms, or explosives</li>
                    <li>Hazardous materials</li>
                    <li>Items that infringe on intellectual property rights</li>
                    <li>Recalled or unsafe products</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                5. Payments and Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">5.1 Platform Fees</h3>
                  <p className="text-slate-700">
                    Rentany charges a 15% service fee on all transactions. This fee covers payment processing, 
                    platform maintenance, customer support, and trust & safety features.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">5.2 Payment Processing</h3>
                  <p className="text-slate-700">
                    All payments are processed securely through Stripe. Payment information is not stored on our servers. 
                    By using Rentany, you agree to Stripe's terms and conditions.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">5.3 Security Deposits</h3>
                  <p className="text-slate-700">
                    Owners may require security deposits. Deposits are held during the rental period and refunded 
                    to renters upon successful return of items in good condition. Deposits may be used to cover 
                    damages or late returns.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">5.4 Payouts to Owners</h3>
                  <p className="text-slate-700">
                    Owners must complete Stripe Connect onboarding to receive payouts. Funds are released after 
                    successful item return, minus the platform fee. Standard payout timing is 2-7 business days.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">5.5 Cancellations and Refunds</h3>
                  <p className="text-slate-700">
                    Cancellation policies are set by owners. Platform fees are non-refundable. 
                    Refunds for canceled rentals are subject to the owner's cancellation policy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                6. Liability and Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">6.1 Platform Disclaimer</h3>
                  <p className="text-slate-700">
                    Rentany is a marketplace platform only. We do not own, inspect, or control the items listed. 
                    We are not responsible for the quality, safety, legality, or condition of items.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">6.2 User Responsibility</h3>
                  <p className="text-slate-700">
                    Users are responsible for their own actions and interactions. This includes verifying item 
                    condition, ensuring insurance coverage, and resolving disputes directly.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">6.3 Limitation of Liability</h3>
                  <p className="text-slate-700">
                    To the maximum extent permitted by law, Rentany shall not be liable for any indirect, incidental, 
                    special, consequential, or punitive damages, or any loss of profits or revenues.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">6.4 Insurance Recommendations</h3>
                  <p className="text-slate-700">
                    We strongly recommend that owners maintain appropriate insurance for their items and that 
                    renters verify their personal liability coverage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                7. Disputes and Resolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">7.1 User Disputes</h3>
                  <p className="text-slate-700">
                    Users should first attempt to resolve disputes directly. Our dispute resolution system 
                    is available to mediate conflicts regarding item condition, damages, or returns.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">7.2 Platform Mediation</h3>
                  <p className="text-slate-700">
                    Rentany may assist in dispute resolution but is not obligated to do so. Our decision 
                    in disputes is final and binding.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">7.3 Evidence Requirements</h3>
                  <p className="text-slate-700">
                    Users must provide evidence (photos, messages, receipts) to support dispute claims. 
                    Condition reports submitted before and after rentals are strongly recommended.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5" />
                8. Prohibited Conduct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">Users may not:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Provide false or misleading information</li>
                <li>Engage in fraudulent activities</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Circumvent platform fees or payment systems</li>
                <li>Create multiple accounts to manipulate reviews or ratings</li>
                <li>Use the platform for any illegal purpose</li>
                <li>Scrape or copy platform content without permission</li>
                <li>Interfere with platform operations or security</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>9. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">9.1 Platform Content</h3>
                  <p className="text-slate-700">
                    All platform content, including logos, design, text, and software, is owned by Rentany 
                    and protected by copyright and trademark laws.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">9.2 User Content</h3>
                  <p className="text-slate-700">
                    You retain ownership of content you post but grant Rentany a worldwide, non-exclusive license 
                    to use, display, and distribute your content on the platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>10. Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                Your use of Rentany is also governed by our Privacy Policy, which explains how we collect, 
                use, and protect your personal data. By using Rentany, you consent to our data practices 
                as described in the Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>11. Modifications to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                We reserve the right to modify these Terms and Conditions at any time. We will notify users 
                of significant changes via email or platform notification. Continued use of the platform 
                after changes constitutes acceptance of the modified terms.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>12. Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">
                We may terminate or suspend your account immediately, without prior notice, for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Violation of these Terms and Conditions</li>
                <li>Fraudulent or illegal activity</li>
                <li>Multiple user complaints or disputes</li>
                <li>Non-payment of fees</li>
                <li>Any conduct that harms the platform or other users</li>
              </ul>
              <p className="text-slate-700 mt-3">
                You may also delete your account at any time through your profile settings.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>13. Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                These Terms and Conditions are governed by and construed in accordance with the laws of [Your Jurisdiction]. 
                Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of [Your Jurisdiction].
              </p>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> Please consult with a legal professional to ensure these terms comply 
                  with the specific laws and regulations in your operating jurisdiction.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>14. Severability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                If any provision of these Terms and Conditions is found to be unenforceable or invalid, 
                that provision shall be limited or eliminated to the minimum extent necessary, and the 
                remaining provisions shall remain in full force and effect.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-white">15. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-200 mb-3">
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="space-y-2 text-slate-200">
                <p><strong>Email:</strong> legal@rentany.com</p>
                <p><strong>Support:</strong> support@rentany.com</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
