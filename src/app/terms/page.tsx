import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-2xl px-6 font-mono text-on-surface">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-md transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Home
        </Link>
      </div>
      <h1 className="text-4xl font-black mb-8 text-primary">Terms of Service</h1>
      <div className="space-y-6 text-sm">
        <p>Last Updated: July 2026</p>
        
        <section>
          <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using Drift, you agree to be bound by these Terms of Service. Drift is a decentralized social network built on the Solana blockchain.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">2. Decentralization & Blockchain</h2>
          <p>Drift utilizes blockchain technology. Interactions, transactions, and data may be irreversibly recorded on the Solana blockchain. We are not responsible for lost assets, failed transactions, or interactions with third-party protocols.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">3. User Conduct</h2>
          <p>You agree not to use Drift for any unlawful purposes or to conduct any unlawful activities, including but not limited to, fraud, embezzlement, money laundering, or the distribution of illicit materials.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4">4. Intellectual Property</h2>
          <p>Users retain ownership of the content they post on Drift. However, by posting content, you grant Drift a non-exclusive license to display, distribute, and utilize your content within the platform ecosystem.</p>
        </section>

        <div className="pt-8 border-t border-outline-variant text-on-surface-variant">
          <p>© 2026 Drift Protocol. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
