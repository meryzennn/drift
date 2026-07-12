import Link from "next/link";

export default function CookiePage() {
  return (
    <div className="max-w-4xl mx-auto py-2xl px-6 font-mono text-on-surface">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-md transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Home
        </Link>
      </div>
      <h1 className="text-4xl font-black mb-8 text-primary">Cookie Policy</h1>
      <div className="space-y-6 text-sm">
        <p>Last Updated: July 2026</p>
        
        <section>
          <h2 className="text-xl font-bold mb-4">1. What are Cookies?</h2>
          <p>Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and provide a better user experience.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">2. How We Use Cookies</h2>
          <p>Drift uses minimal cookies and local storage to enhance your experience. Specifically, we use local storage to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Remember your wallet connection state so you don't have to reconnect every time.</li>
            <li>Store your UI preferences, such as theme settings or language choices.</li>
            <li>Cache certain blockchain data locally to speed up feed loading times.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">3. Third-Party Cookies</h2>
          <p>We do not use third-party tracking cookies or advertising networks. Drift is built with privacy in mind. However, RPC providers and external services (like embedded videos or images) may set their own operational cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">4. Managing Your Preferences</h2>
          <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies or local storage, you may not be able to use some portions of our platform (such as remaining logged in with your wallet).</p>
        </section>

        <div className="pt-8 border-t border-outline-variant text-on-surface-variant">
          <p>© 2026 Drift Protocol. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
