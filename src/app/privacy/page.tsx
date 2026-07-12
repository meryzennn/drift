import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-2xl px-6 font-mono text-on-surface">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-md transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Home
        </Link>
      </div>
      <h1 className="text-4xl font-black mb-8 text-primary">Privacy Policy</h1>
      <div className="space-y-6 text-sm">
        <p>Last Updated: July 2026</p>
        
        <section>
          <h2 className="text-xl font-bold mb-4">1. Data Collection</h2>
          <p>As a decentralized application, Drift operates fundamentally differently from traditional web platforms. We do not require an email address or traditional password. Your identity is tied to your Solana wallet address.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">2. Public Blockchain Data</h2>
          <p>Please be aware that any transactions made through Drift, including tips, profile updates (if stored on-chain), and interactions with smart contracts, are permanently recorded on the public Solana blockchain and cannot be deleted.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">3. Off-Chain Data</h2>
          <p>To provide a seamless experience, we store certain data off-chain in secure databases (such as posts, direct messages, and media). Direct messages are end-to-end encrypted; however, public posts and profile metadata are accessible to all users.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">4. Third-Party Services</h2>
          <p>We may use third-party services for infrastructure, such as Cloudflare R2 for media storage and Supabase for off-chain indexing. These services operate under their own privacy policies.</p>
        </section>

        <div className="pt-8 border-t border-outline-variant text-on-surface-variant">
          <p>© 2026 Drift Protocol. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
