import React from 'react';
import { ShieldCheck, ArrowLeft, Scale, Lock, AlertTriangle, FileText, Users, CreditCard, Ban, RefreshCw, Globe, Mail } from 'lucide-react';

interface TermsOfServicePageProps {
  onNavigate: (page: string) => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="glass-panel rounded-2xl border border-emerald-500/15 p-6 sm:p-8 space-y-4">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
    </div>
    <div className="text-sm text-slate-400 leading-relaxed space-y-3 pl-12">
      {children}
    </div>
  </div>
);

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#030d07] text-white">
      {/* Header */}
      <div className="border-b border-emerald-500/15 bg-[#040f09] sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Terms of Service</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            LEGAL AGREEMENT
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Terms of Service</h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Effective Date: <strong className="text-emerald-400">1 January 2025</strong> &nbsp;·&nbsp; Last Updated: <strong className="text-emerald-400">September 2026</strong>
          </p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Please read these Terms of Service carefully before using PayVia360. By accessing or using the platform, you agree to be bound by these terms.
          </p>
        </div>

        {/* Sections */}
        <Section icon={<FileText className="h-5 w-5" />} title="1. Definitions & Scope">
          <p>
            <strong className="text-white">"PayVia360"</strong>, <strong className="text-white">"we"</strong>, <strong className="text-white">"us"</strong>, or <strong className="text-white">"our"</strong> refers to the PayVia360 platform and its operators, accessible at payvia360.com.
          </p>
          <p>
            <strong className="text-white">"You"</strong> or <strong className="text-white">"User"</strong> refers to any individual or entity that creates an account, accesses the platform, or uses the PayVia360 APIs, dashboard, or hosted checkout pages.
          </p>
          <p>
            <strong className="text-white">"Merchant Account"</strong> refers to any third-party payment or banking account (e.g., Paytm Business, BharatPe, FamPay, Freecharge, UPI) that you connect to the PayVia360 platform.
          </p>
          <p>
            These Terms govern your use of the PayVia360 platform, APIs, hosted checkout pages, and all associated services. Use of PayVia360 implies acceptance of these Terms in full.
          </p>
        </Section>

        <Section icon={<Users className="h-5 w-5" />} title="2. Eligibility & Account Registration">
          <p>You must be at least 18 years of age to create a PayVia360 account. By registering, you represent and warrant that:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You are legally permitted to enter into binding contracts in your jurisdiction.</li>
            <li>All information you provide during registration is accurate, current, and complete.</li>
            <li>You are the authorized owner or operator of any Merchant Account you connect to the platform.</li>
            <li>You will not share your login credentials or permit unauthorized access to your account.</li>
          </ul>
          <p>PayVia360 reserves the right to terminate or suspend accounts that provide false information or violate these terms.</p>
        </Section>

        <Section icon={<CreditCard className="h-5 w-5" />} title="3. How PayVia360 Works — Zero Custody">
          <p>PayVia360 is a <strong className="text-emerald-300">non-custodial payment management platform</strong>. We do <strong className="text-white">not</strong>:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Hold, receive, or move any funds on your behalf.</li>
            <li>Act as a payment aggregator, financial intermediary, or escrow service.</li>
            <li>Store payer banking credentials or payment instrument details.</li>
          </ul>
          <p>
            PayVia360 generates payment requests, hosts branded checkout pages, and monitors incoming transactions on Merchant Accounts you connect. All funds move directly from the payer to your own verified merchant accounts. You are solely responsible for compliance with applicable financial regulations in your jurisdiction.
          </p>
        </Section>

        <Section icon={<Lock className="h-5 w-5" />} title="4. Google Account Data & Limited Use">
          <p>
            If you connect a Google account (to detect FamPay payments via Gmail), PayVia360 accesses only the minimum required OAuth scopes:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><code className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded text-xs">.../auth/userinfo.email</code> — to display your linked email.</li>
            <li><code className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded text-xs">.../auth/gmail.readonly</code> — to search for FamPay payment notification emails <strong>only while a payment request is pending</strong>.</li>
          </ul>
          <p>
            PayVia360's use and transfer of information received from Google APIs adheres strictly to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-emerald-400 underline hover:text-emerald-300">Google API Services User Data Policy</a>, including the Limited Use requirements. We do not sell, share, or use Google data for advertising or AI training.
          </p>
          <p>You can revoke Google access at any time from your Merchants tab or via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-emerald-400 underline hover:text-emerald-300">myaccount.google.com/permissions</a>.</p>
        </Section>

        <Section icon={<Ban className="h-5 w-5" />} title="5. Prohibited Uses">
          <p>You agree <strong className="text-white">not</strong> to use PayVia360 for:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Collecting payments for illegal goods or services.</li>
            <li>Fraud, money laundering, or any activity prohibited by applicable law.</li>
            <li>Collecting funds that you are not legally entitled to receive.</li>
            <li>Attempting to reverse-engineer, scrape, or disrupt the platform.</li>
            <li>Using the API or platform to build a competing service without written consent.</li>
            <li>Impersonating another person or entity in any payment or account context.</li>
            <li>Storing payer data collected through PayVia360 in violation of applicable data protection laws.</li>
          </ul>
          <p>Violation of these prohibitions may result in immediate account suspension, legal action, and reporting to relevant authorities.</p>
        </Section>

        <Section icon={<RefreshCw className="h-5 w-5" />} title="6. Subscriptions, Plans & Refunds">
          <p>PayVia360 offers subscription-based access to advanced features. The following terms apply to all paid plans:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Subscription fees are billed as displayed on the Pricing page at the time of purchase.</li>
            <li>Plans are auto-renewed unless cancelled before the renewal date from your account settings.</li>
            <li>All payments are final. <strong className="text-white">No refunds are issued</strong> for partial billing periods, unused quota, or plan downgrades, except where required by applicable consumer protection law.</li>
            <li>PayVia360 reserves the right to modify pricing with at least 14 days' advance notice to active subscribers.</li>
            <li>Free-tier access may be modified or discontinued at any time without notice.</li>
          </ul>
        </Section>

        <Section icon={<AlertTriangle className="h-5 w-5" />} title="7. Disclaimer of Warranties & Limitation of Liability">
          <p>
            PayVia360 is provided <strong className="text-white">"as is"</strong> and <strong className="text-white">"as available"</strong> without any warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>PayVia360 does not guarantee:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Uninterrupted, error-free, or secure operation of the platform.</li>
            <li>The accuracy or completeness of transaction records derived from third-party merchant account data.</li>
            <li>That payment detection will function correctly if third-party notification formats change.</li>
          </ul>
          <p>
            To the maximum extent permitted by law, PayVia360 shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including loss of revenue, data, or business opportunities.
          </p>
          <p>Our total liability to you for any claim shall not exceed the subscription fees you paid in the 30 days preceding the claim.</p>
        </Section>

        <Section icon={<Globe className="h-5 w-5" />} title="8. Intellectual Property">
          <p>
            All content, branding, UI designs, APIs, and underlying technology of PayVia360 are the exclusive intellectual property of PayVia360 and its licensors. You are granted a limited, non-exclusive, non-transferable licence to use the platform solely for its intended purpose.
          </p>
          <p>
            You retain full ownership of your transaction data. By using PayVia360, you grant us a limited licence to process and store that data solely to provide the service.
          </p>
        </Section>

        <Section icon={<ShieldCheck className="h-5 w-5" />} title="9. Privacy & Data Protection">
          <p>
            We collect and process personal data as described in our Privacy Policy. Key principles:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We collect only the minimum data required to operate the platform.</li>
            <li>We do not sell your personal data to third parties.</li>
            <li>Transaction logs are retained for a minimum of 90 days for dispute resolution purposes.</li>
            <li>You may request deletion of your account and associated data by contacting <a href="mailto:support@payvia360.com" className="text-emerald-400 underline hover:text-emerald-300">support@payvia360.com</a>.</li>
          </ul>
        </Section>

        <Section icon={<Scale className="h-5 w-5" />} title="10. Governing Law & Dispute Resolution">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall first be attempted to be resolved amicably through direct communication with our support team.
          </p>
          <p>
            If a dispute cannot be resolved informally within 30 days, both parties agree to submit to the exclusive jurisdiction of the competent courts located in India.
          </p>
        </Section>

        <Section icon={<RefreshCw className="h-5 w-5" />} title="11. Modifications to Terms">
          <p>
            PayVia360 reserves the right to update these Terms at any time. We will notify active users of material changes via email or an in-dashboard notice at least <strong className="text-white">7 days</strong> before changes take effect. Your continued use of the platform after the effective date constitutes acceptance of the updated Terms.
          </p>
          <p>
            You should review these Terms periodically. The most current version will always be available at <span className="text-emerald-400">payvia360.com/terms</span>.
          </p>
        </Section>

        {/* Contact */}
        <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/20 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm mb-1">Questions about these Terms?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you have any questions, concerns, or legal requests regarding these Terms of Service, please contact our team directly.
            </p>
          </div>
          <a
            href="mailto:support@payvia360.com"
            className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-5 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 transition"
          >
            <Mail className="h-4 w-4" />
            support@payvia360.com
          </a>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-600 font-mono pb-6">
          © 2026 PayVia360 Engine · These Terms are effective as of 1 January 2025
        </p>

      </div>
    </div>
  );
};
