import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-4" data-testid="terms-page">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 mb-6"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      
      <div className="space-y-6 text-sm text-zinc-300">
        <p className="text-zinc-500">Last updated: February 19, 2026</p>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using EdgeLog ("the App"), you agree to be bound by these 
            Terms of Service. If you do not agree to these terms, do not use the App.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
          <p>
            EdgeLog is a trading journal application that allows users to log, track, and analyze 
            their trading activities. The App provides features including trade logging, performance 
            analytics, AI-generated insights, and data export capabilities.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. User Accounts</h2>
          <p>
            You must create an account using Google Sign-In or Apple Sign-In to use the App. 
            You are responsible for maintaining the confidentiality of your account and for all 
            activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Subscription Terms</h2>
          <div className="space-y-2">
            <p><strong>Free Trial:</strong> New users receive a 7-day free trial of Premium features.</p>
            <p><strong>Premium Subscription:</strong> After the trial, Premium features require a paid subscription at $5.99/month or $49.99/year.</p>
            <p><strong>Auto-Renewal:</strong> Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period.</p>
            <p><strong>Cancellation:</strong> You may cancel your subscription at any time. Upon cancellation, you will retain Premium access until the end of your current billing period.</p>
            <p><strong>No Refunds:</strong> We do not provide refunds for partial billing periods or unused subscription time.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Payment Processing</h2>
          <p>
            Payments are processed through Apple App Store or Google Play Store. All payment terms, 
            including refund policies, are subject to the respective platform's terms of service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data & Privacy</h2>
          <p>
            Your trading data is stored securely in our cloud database. Free users' trade history 
            is retained for 14 days. Premium users have unlimited data retention. Please review our 
            Privacy Policy for more details on how we handle your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Disclaimer</h2>
          <p>
            EdgeLog is a journaling and analytics tool only. It does not provide financial advice, 
            trading recommendations, or investment guidance. Trading involves significant risk of loss. 
            Past performance recorded in the App does not guarantee future results.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, EdgeLog and its developers shall not be liable 
            for any indirect, incidental, special, consequential, or punitive damages, or any loss 
            of profits or revenues, whether incurred directly or indirectly, or any loss of data, 
            use, goodwill, or other intangible losses resulting from your use of the App.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of any 
            material changes through the App or via email. Your continued use of the App after 
            such modifications constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at support@edgelog.app.
          </p>
        </section>
      </div>
    </div>
  );
}
