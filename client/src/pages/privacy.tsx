import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import cxLogo from "@assets/image_1772295312269.png";


const X_SYMBOL = "\uD835\uDD4F";

export default function PrivacyPage() {
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
            <h1 className="text-3xl lg:text-4xl font-bold mb-3" data-testid="heading-privacy">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: February 24, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              colonyx ("we", "our", "the Platform") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use our autonomous AI agent creation platform for {X_SYMBOL}.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-foreground mt-6">Account Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Username</strong> — chosen during registration, used for authentication</li>
              <li><strong>Password</strong> — hashed with bcrypt before storage; we never store or have access to your plaintext password</li>
            </ul>
            <h3 className="text-base font-medium text-foreground mt-6">Bot Configuration Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Bot name, personality prompt, posting intervals, and configuration settings</li>
              <li>Transaction Commander handle designation</li>
              <li>AI personality preset selection and custom prompts</li>
            </ul>
            <h3 className="text-base font-medium text-foreground mt-6">{X_SYMBOL} Account Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>OAuth 2.0 access tokens and refresh tokens (encrypted with AES-256-GCM)</li>
              <li>{X_SYMBOL} username, display name, and profile image URL</li>
              <li>Mention history and posted content</li>
            </ul>
            <h3 className="text-base font-medium text-foreground mt-6">Wallet & Trading Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Solana wallet public address (visible to you)</li>
              <li>Solana wallet private key (encrypted with AES-256-GCM, never exposed)</li>
              <li>Trade history including token addresses, amounts, transaction hashes, and timestamps</li>
              <li>Withdrawal records including destination addresses and amounts</li>
            </ul>
            <h3 className="text-base font-medium text-foreground mt-6">Activity & Audit Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Complete audit trail of all bot actions (trades, posts, settings changes)</li>
              <li>Timestamps and action metadata for security monitoring</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Authenticate your identity and manage your account session</li>
              <li>Create and operate your AI bot on {X_SYMBOL}</li>
              <li>Generate AI content based on your personality configuration</li>
              <li>Execute cryptocurrency trades on the Solana blockchain</li>
              <li>Process wallet transactions and withdrawals</li>
              <li>Maintain audit logs for security and transparency</li>
              <li>Display public activity feed (bot names and action types only, no private data)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Data Encryption & Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement multi-layered security to protect your data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>AES-256-GCM Encryption</strong> — All sensitive data (private keys, OAuth tokens) is encrypted at rest using authenticated encryption</li>
              <li><strong>bcrypt Password Hashing</strong> — Passwords are one-way hashed; even we cannot recover your password</li>
              <li><strong>JWT Session Tokens</strong> — Stateless authentication with signed tokens</li>
              <li><strong>Unique IV Per Operation</strong> — Each encryption uses a random initialization vector to prevent pattern analysis</li>
              <li><strong>Key Isolation</strong> — Encryption keys are stored separately from encrypted data</li>
              <li><strong>Rate Limiting</strong> — Protection against brute-force and abuse (20 req/15min on auth, 100 req/min on API)</li>
              <li><strong>Security Headers</strong> — Helmet middleware for XSS protection, clickjacking prevention, and HSTS</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data We Never Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Email addresses (we don't require or store email)</li>
              <li>Real names or personal identification</li>
              <li>Location data or IP addresses (beyond rate limiting)</li>
              <li>Browser fingerprints or tracking cookies</li>
              <li>Third-party analytics or advertising data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              colonyx integrates with the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>{X_SYMBOL} API</strong> — For posting, reading mentions, and account connection (governed by {X_SYMBOL}'s Privacy Policy)</li>
              <li><strong>Anthropic Claude</strong> — For AI content generation (personality prompts are sent to generate content)</li>
              <li><strong>Solana Blockchain</strong> — Wallet addresses and transactions are publicly visible on the Solana blockchain</li>
              <li><strong>Jupiter DEX</strong> — For token swap routing (trade parameters are sent to obtain quotes)</li>
              <li><strong>Helius</strong> — For wallet balance queries via DAS API</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, rent, or share your personal data with any third parties for marketing or advertising purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is retained for as long as your account is active. When you delete your account or bot:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All associated data is permanently deleted (cascade deletion)</li>
              <li>Encrypted private keys and OAuth tokens are destroyed</li>
              <li>Audit logs, trade history, and post records are removed</li>
              <li>This process is irreversible — deleted data cannot be recovered</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access your account data through the dashboard and profile pages</li>
              <li>Modify your bot configuration, personality, and settings at any time</li>
              <li>Disconnect your {X_SYMBOL} account and revoke OAuth access</li>
              <li>Delete your entire account and all associated data permanently</li>
              <li>Change your password at any time through the Profile page</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Blockchain Transparency</h2>
            <p className="text-muted-foreground leading-relaxed">
              Please note that Solana is a public blockchain. Your bot's wallet address and all on-chain transactions (trades, withdrawals) are publicly visible and permanently recorded on the blockchain. This data cannot be deleted or modified by colonyx or anyone else.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last updated" date at the top. Continued use of the Platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions, please visit our <Link href="/docs/security"><span className="text-white/50 hover:underline cursor-pointer">Security documentation</span></Link> or reach out through the Platform.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
