import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-2xl px-6 font-mono text-on-surface pb-24 md:pb-8">
      <div className="mb-8">
        <Link 
          href="/settings?tab=about" 
          className="group w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant hover:border-primary hover:bg-primary/10 transition-all duration-200 active:scale-90 shrink-0"
          title="Back to About"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors duration-200 group-hover:-translate-x-0.5 inline-block transition-transform">
            arrow_back
          </span>
        </Link>
      </div>
      <h1 className="text-2xl sm:text-4xl font-black mb-8 text-primary">Terms of Service (Straight Talk)</h1>
      <div className="space-y-6 text-[11px] sm:text-sm leading-relaxed text-justify [&_h2]:text-left">
        <p>Last Updated: July 2026</p>
        
        <section>
          <h2 className="text-xl font-bold mb-4">1. The TL;DR</h2>
          <p>By using Drift, you agree to our rules. We built Drift on Solana, which means it's decentralized. We don't hold your data hostage, but that also means you're entirely responsible for whatever you do on here.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">2. Blockchain & Crypto Realities</h2>
          <p>Because we use blockchain, any on-chain actions (like sending tips or interacting with smart contracts) are final and cannot be reversed. If you send crypto to the wrong address or get scammed outside the platform, we can't refund you. Please be smart and stay safe.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">3. Don't Be a Jerk</h2>
          <p>Freedom of speech doesn't mean freedom to wreak havoc. Don't use this platform to scam people, spread malware, launder money, or do anything illegal. If you do, we reserve the right to block your access from our platform.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4">4. Content Ownership</h2>
          <p>Whatever you post belongs 100% to you. However, by posting it, you give us permission to display it on other people's feeds, the explore page, and other parts of Drift so the app actually works.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">5. Need Help?</h2>
          <p>If you run into technical issues, find a bug, or just want to leave some casual feedback, shoot us an email directly at <strong>drift@0x5zen.dev</strong>. We'll try to get back to you ASAP.</p>
        </section>

        <div className="pt-8 border-t border-outline-variant text-on-surface-variant mt-12">
          <p>© 2026 Drift Protocol. Built with sweat and coffee.</p>
        </div>
      </div>
    </div>
  );
}
