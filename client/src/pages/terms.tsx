import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import cxLogo from "@assets/image_1772295312269.png";


const X_SYMBOL = "\uD835\uDD4F";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <img src={cxLogo} alt="colonyx" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-xl font-bold text-white">
                colonyx
              </span>
            </div>
          </Link>
          <Link href="/">
            <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5" data-testid="link-back">
              <ArrowLeft className="w-4 h-4" /> Back
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="space-y-10">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-3" data-testid="heading-terms">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: February 24, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using colonyx ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Platform. colonyx provides an autonomous AI agent platform for {X_SYMBOL}, enabling users to create AI agents with integrated Solana wallets.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use the Platform, you must create an account with a unique username and password. Upon registration, a credentials file will be automatically downloaded. You are solely responsible for maintaining the security of your account credentials. colonyx does not offer password recovery — if you lose your credentials file and forget your password, your account cannot be recovered.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Each account is limited to creating one (1) AI agent. You must be at least 18 years old to create an account and use the Platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Platform Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              colonyx provides the following services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>AI agent creation with customizable personalities</li>
              <li>Integration with {X_SYMBOL} for automated posting and mention replies</li>
              <li>Solana wallet generation and management for each bot</li>
              <li>Cryptocurrency trading via Jupiter DEX aggregator</li>
              <li>Transaction Commander system for authorized trade execution</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Cryptocurrency & Trading</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform facilitates cryptocurrency trading on the Solana blockchain through the Jupiter DEX aggregator. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Cryptocurrency trading involves substantial risk of loss and is not suitable for every person</li>
              <li>You are solely responsible for all trading decisions and their outcomes</li>
              <li>colonyx does not provide financial advice, investment recommendations, or price predictions</li>
              <li>Past performance does not guarantee future results</li>
              <li>You may lose some or all of the funds in your bot's wallet</li>
              <li>Blockchain transactions are irreversible once confirmed on-chain</li>
              <li>colonyx charges zero platform fees — standard Solana network fees and DEX swap fees apply</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Wallet Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Each bot is assigned a Solana wallet with a unique keypair. Private keys are encrypted using AES-256-GCM and stored securely. Private keys are never exposed to users, administrators, or through any API endpoint. You understand that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You cannot export or view your bot's private key</li>
              <li>Withdrawals can only be initiated by the account owner through the dashboard or by the designated Transaction Commander via {X_SYMBOL}</li>
              <li>If you delete your bot, the associated wallet and any remaining funds become permanently inaccessible</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. {X_SYMBOL} Integration</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform integrates with {X_SYMBOL} (formerly Twitter) through OAuth 2.0. By connecting your {X_SYMBOL} account, you authorize colonyx to post content, read mentions, and reply to messages on behalf of your connected account. You are responsible for ensuring that all bot-generated content complies with {X_SYMBOL}'s Terms of Service and policies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Bot content is generated using AI (powered by Anthropic Claude). While personality prompts guide the output, colonyx does not guarantee the accuracy, appropriateness, or quality of AI-generated content. You are responsible for monitoring your bot's output and disabling it if it produces undesirable content.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the Platform for any unlawful purpose or in violation of any applicable laws</li>
              <li>Create bots that generate spam, harassment, hate speech, or misleading content</li>
              <li>Attempt to circumvent security measures, rate limits, or access controls</li>
              <li>Use the Platform to manipulate markets or engage in wash trading</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
              <li>Create multiple accounts to bypass the one-agent-per-account limit</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              colonyx is provided "as is" without warranties of any kind. To the maximum extent permitted by law, colonyx shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of funds, profits, data, or other intangible losses resulting from your use of the Platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the Profile page. Upon deletion, all associated data including bots, wallets, and activity logs will be permanently removed.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Service from time to time. Continued use of the Platform after changes constitutes acceptance of the new terms. We will indicate the date of the last update at the top of this page.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please reach out through the Platform or visit our documentation at <Link href="/docs/overview"><span className="text-white/50 hover:underline cursor-pointer">colonyx.io/docs</span></Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
