'use client'


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Eye, Trash2, Download } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-slate-900" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
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
                <Eye className="w-5 h-5" />
                1. Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <p className="text-slate-700">
                Welcome to Rentany. We are committed to protecting your personal data and respecting your privacy. 
                This privacy policy explains how we collect, use, store, and protect your information when you use our peer-to-peer rental marketplace platform.
              </p>
              <p className="text-slate-700">
                Rentany operates as a marketplace connecting people who want to rent items with those who have items to rent. 
                We are the data controller responsible for your personal data.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                2. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.1 Information You Provide</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li><strong>Account Information:</strong> Name, email address, username, profile picture, bio</li>
                  <li><strong>Verification Information:</strong> Identity verification documents processed through Stripe Identity</li>
                  <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store card details)</li>
                  <li><strong>Item Listings:</strong> Photos, videos, descriptions, pricing, location information</li>
                  <li><strong>Communications:</strong> Messages exchanged with other users, reviews, dispute information</li>
                  <li><strong>Transaction Data:</strong> Rental requests, bookings, payment history</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.2 Information Collected Automatically</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
                  <li><strong>Device Information:</strong> IP address, browser type, device type</li>
                  <li><strong>Location Data:</strong> Approximate location (when you enable location services)</li>
                  <li><strong>Cookies:</strong> See our Cookie Policy section below</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>3. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">We use your personal data for the following purposes:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>Service Provision:</strong> To enable rentals between users, process payments, and facilitate communication</li>
                <li><strong>Identity Verification:</strong> To verify your identity and prevent fraud</li>
                <li><strong>Safety and Security:</strong> To protect users, prevent abuse, and resolve disputes</li>
                <li><strong>Communication:</strong> To send notifications about bookings, messages, and platform updates</li>
                <li><strong>Improvement:</strong> To analyze usage and improve our platform</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and respond to legal requests</li>
                <li><strong>Marketing:</strong> To send promotional communications (you can opt out anytime)</li>
              </ul>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Legal Basis (GDPR):</strong> We process your data based on: (1) Contract performance, (2) Legal obligations, 
                  (3) Legitimate interests, and (4) Your consent (which you can withdraw at any time).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>4. Data Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.1 With Other Users</h3>
                  <p className="text-slate-700">
                    When you create a rental request or list an item, certain information (name, username, profile picture, reviews) 
                    is visible to other users to facilitate transactions.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.2 Service Providers</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li><strong>Stripe:</strong> Payment processing and identity verification (PCI-DSS and GDPR compliant)</li>
                    <li><strong>Base44:</strong> Platform infrastructure and hosting</li>
                    <li><strong>Clerk:</strong> Authentication services</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.3 Legal Requirements</h3>
                  <p className="text-slate-700">
                    We may disclose your information if required by law, court order, or to protect rights, property, or safety.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.4 Business Transfers</h3>
                  <p className="text-slate-700">
                    If Rentany is involved in a merger, acquisition, or sale, your data may be transferred to the new entity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>5. Your Rights (GDPR)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">Under GDPR and similar regulations, you have the following rights:</p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Eye className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Right to Access</h4>
                    <p className="text-sm text-slate-600">Request a copy of your personal data</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Download className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Right to Portability</h4>
                    <p className="text-sm text-slate-600">Receive your data in a structured, machine-readable format</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Trash2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Right to Erasure</h4>
                    <p className="text-sm text-slate-600">Request deletion of your personal data (subject to legal obligations)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Lock className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Right to Rectification</h4>
                    <p className="text-sm text-slate-600">Correct inaccurate personal data</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Shield className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Right to Restriction</h4>
                    <p className="text-sm text-slate-600">Limit how we use your data</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Mail className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Right to Object</h4>
                    <p className="text-sm text-slate-600">Object to processing based on legitimate interests or direct marketing</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  <strong>To exercise your rights,</strong> please contact us at the email address provided below. 
                  We will respond within 30 days.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>6. Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">
                We implement appropriate technical and organizational measures to protect your personal data, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Secure authentication (Clerk)</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication</li>
                <li>Secure payment processing through Stripe (PCI-DSS certified)</li>
              </ul>
              <p className="text-slate-700 mt-3">
                While we strive to protect your data, no method of transmission over the internet is 100% secure. 
                We cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>7. Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                We retain your personal data for as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 mt-2">
                <li><strong>Account Data:</strong> Until you delete your account, plus 90 days</li>
                <li><strong>Transaction Records:</strong> 7 years (tax and legal requirements)</li>
                <li><strong>Messages:</strong> Until deleted by users or account closure</li>
                <li><strong>Verification Data:</strong> As required by law and Stripe's policies</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>8. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>Essential Cookies:</strong> Required for platform functionality (authentication, security)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-slate-700 mt-3">
                You can control cookies through your browser settings. Note that disabling essential cookies may affect platform functionality.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>9. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                Your data may be processed and stored in countries outside the European Economic Area (EEA). 
                We ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 mt-2">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Adequacy decisions for certain countries</li>
                <li>Service providers certified under privacy frameworks</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>10. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                Rentany is not intended for users under 18 years of age. We do not knowingly collect personal data from children. 
                If you believe we have collected data from a child, please contact us immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>11. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                We may update this privacy policy from time to time. We will notify you of significant changes via email or 
                through a notice on our platform. Your continued use of Rentany after changes constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5" />
                12. Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-200 mb-3">
                If you have any questions about this privacy policy or wish to exercise your rights, please contact us:
              </p>
              <div className="space-y-2 text-slate-200">
                <p><strong>Email:</strong> privacy@rentany.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@rentany.com</p>
              </div>
              <div className="mt-4 p-4 bg-white/10 rounded-lg">
                <p className="text-sm text-slate-200">
                  <strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with your local 
                  data protection authority if you believe we have not handled your personal data appropriately.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
