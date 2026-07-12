import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-2xl px-6 font-mono text-on-surface pb-24 md:pb-8">
      <div className="mb-8">
        <Link href="/settings?tab=about" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-md transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to About
        </Link>
      </div>
      <h1 className="text-2xl sm:text-4xl font-black mb-8 text-primary">Privacy Policy (Honestly)</h1>
      <div className="space-y-6 text-[11px] sm:text-sm leading-relaxed text-justify [&_h2]:text-left">
        <p>Last Updated: July 2026</p>
        
        <section>
          <h2 className="text-xl font-bold mb-4">1. What Data Do We Actually Keep?</h2>
          <p>Honestly, we only store the bare minimum required to make this app function. We know your <em>wallet address</em> when you connect, the display name and bio you set yourself, and your interactions on the platform (like follows, comments, and posts). The rest of your <em>blockchain</em> activity lives on Solana, not in our database.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">2. How Do We Use Your Data?</h2>
          <p>We use your data purely to display your profile to others and make your feed work. We <strong>do not sell</strong> your data to third parties so they can target you with weird ads. We're just focused on building a cool Web3 social network, not selling your privacy.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">3. Blockchain Transparency</h2>
          <p>Remember, this is Web3. Anything you do <em>on-chain</em> (like tipping or transacting) is public and permanent. When you send something over the blockchain, anyone in the world can see the transaction history of your wallet. Act accordingly.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">4. Complaints or Questions?</h2>
          <p>If you feel like your data leaked from our end, or you just have random privacy questions, hit up our official email: <strong>drift@0x5zen.dev</strong>.</p>
        </section>

        <div className="pt-8 border-t border-outline-variant text-on-surface-variant mt-12">
          <p>© 2026 Drift Protocol. Your data, your rights.</p>
        </div>
      </div>
    </div>
  );
}
