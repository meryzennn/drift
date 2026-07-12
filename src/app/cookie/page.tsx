import Link from "next/link";

export default function CookiePage() {
  return (
    <div className="max-w-4xl mx-auto py-2xl px-6 font-mono text-on-surface pb-24 md:pb-8">
      <div className="mb-8">
        <Link href="/settings?tab=about" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-md transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to About
        </Link>
      </div>
      <h1 className="text-2xl sm:text-4xl font-black mb-8 text-primary">Cookie Policy (For Real)</h1>
      <div className="space-y-6 text-[11px] sm:text-sm leading-relaxed text-justify [&_h2]:text-left">
        <p>Last Updated: July 2026</p>
        
        <section>
          <h2 className="text-xl font-bold mb-4">1. Why Do We Use Cookies?</h2>
          <p>Honestly speaking, we couldn't be bothered to build one of those annoying massive "Accept All Cookies" pop-ups. We only use cookies and <em>local storage</em> for crucial stuff, like saving your wallet session so you don't have to reconnect your wallet every single time you refresh the page. That's literally it.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">2. Not for Creepy Tracking</h2>
          <p>We don't use third-party cookies to track what you're buying on other websites, or to spam you with height-increasing supplement ads in your feed. On Drift, cookies have exactly one job: making your Solana wallet login experience seamless.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">3. Want to Delete Them?</h2>
          <p>Be our guest. You can clear your cache and cookies in your browser whenever you want. The only catch is you'll be logged out and will have to click the "Connect Wallet" button again the next time you visit. Easy, right?</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">4. Casual Inquiries</h2>
          <p>If you're still paranoid about our cookies or have any other issues, just send an email to: <strong>drift@0x5zen.dev</strong>. We're happy to chat.</p>
        </section>

        <div className="pt-8 border-t border-outline-variant text-on-surface-variant mt-12">
          <p>© 2026 Drift Protocol. 100% free of malicious cookies.</p>
        </div>
      </div>
    </div>
  );
}
