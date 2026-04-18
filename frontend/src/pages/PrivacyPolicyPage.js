import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const lastUpdated = "February 15, 2026";

  return (
    <div className="min-h-screen bg-[#050505] text-white" data-testid="privacy-page">
      {/* Header */}
      <header className="app-header sticky top-0 bg-[#050505]/90 backdrop-blur-lg z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-heading text-lg font-bold tracking-wider uppercase">Privacy Policy</h1>
        <div className="w-9" />
      </header>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">EdgeLog Privacy Policy</h1>
            <p className="text-xs text-zinc-500">Last updated: {lastUpdated}</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* Introduction */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Introduction</h2>
            <p>
              EdgeLog ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our 
              mobile application EdgeLog (the "App").
            </p>
            <p className="mt-2">
              Please read this Privacy Policy carefully. By using the App, you agree to the collection 
              and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. Information We Collect</h2>
            
            <h3 className="text-zinc-400 font-medium mt-3 mb-1">2.1 Personal Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>Name (from your Google account)</li>
              <li>Email address</li>
              <li>Profile picture (if provided by your sign-in provider)</li>
            </ul>

            <h3 className="text-zinc-400 font-medium mt-3 mb-1">2.2 Trading Data</h3>
            <p>When you use the App, you may provide:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>Trade details (trading pairs, entry/exit prices, lot sizes)</li>
              <li>Trade outcomes and profit/loss information</li>
              <li>Personal notes and emotions related to trades</li>
              <li>Screenshots of your trading charts</li>
            </ul>

            <h3 className="text-zinc-400 font-medium mt-3 mb-1">2.3 Automatically Collected Information</h3>
            <p>We may automatically collect:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>Device information (device type, operating system)</li>
              <li>Usage data (features used, time spent in app)</li>
              <li>Log data (IP address, access times)</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>Provide and maintain the App's functionality</li>
              <li>Create and manage your account</li>
              <li>Store and display your trading journal entries</li>
              <li>Generate analytics and performance reports</li>
              <li>Provide AI-powered insights on your trading performance</li>
              <li>Send you notifications (if enabled)</li>
              <li>Improve our services and user experience</li>
              <li>Respond to your inquiries and support requests</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely in cloud databases. We implement appropriate technical and 
              organizational security measures to protect your personal information against unauthorized 
              access, alteration, disclosure, or destruction.
            </p>
            <p className="mt-2">
              <strong className="text-white">Free Plan Data Retention:</strong> Trade data is retained 
              for 14 days. After this period, older trades are automatically deleted from our servers.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li><strong className="text-white">Google Sign-In:</strong> For authentication</li>
              <li><strong className="text-white">Cloudinary:</strong> For storing trade screenshots</li>
              <li><strong className="text-white">OpenAI:</strong> For generating AI-powered trading insights</li>
              <li><strong className="text-white">MongoDB:</strong> For data storage</li>
            </ul>
            <p className="mt-2">
              Each third-party service has its own privacy policy governing the use of your information.
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Data Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>With service providers who assist in operating our App (under strict confidentiality)</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your trading data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, please contact us at the email address provided below.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">8. Children's Privacy</h2>
            <p>
              The App is not intended for use by anyone under the age of 18. We do not knowingly collect 
              personal information from children under 18. If you are a parent or guardian and believe 
              your child has provided us with personal information, please contact us.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are 
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-white font-semibold text-base mb-2">10. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="mt-2 p-4 bg-white/5 rounded-lg">
              <p><strong className="text-white">EdgeLog</strong></p>
              <p>Email: <a href="mailto:ck.ravuri@gmail.com" className="text-green-500 hover:underline">ck.ravuri@gmail.com</a></p>
            </div>
          </section>

          {/* Consent */}
          <section className="pt-4 border-t border-white/10">
            <p className="text-zinc-400 text-xs">
              By using EdgeLog, you acknowledge that you have read and understood this Privacy Policy 
              and agree to its terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
