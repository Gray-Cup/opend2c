import { Metadata } from "next";
import { generateTitle, generateDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: generateTitle("Privacy Policy"),
  description: generateDescription(
    "Privacy Policy for Open D2C — how we collect, use, and protect data for buyers and sellers on the platform.",
  ),
};

const LAST_UPDATED = "May 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto min-h-screen py-10 lg:py-20 px-4">
      <h1 className="text-3xl font-bold text-neutral-800 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-8">

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">1. Who we are</h2>
          <p className="text-neutral-600">
            Gray Cup Enterprises Private Limited operates the Open D2C platform — a product discovery
            and search platform for Indian direct-to-consumer brands. This Privacy Policy explains how
            we collect and use information when you use our website as a buyer or connect your store
            as a seller.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">2. What we collect</h2>

          <p className="text-sm font-medium text-neutral-700 mb-2">From buyers (visitors browsing the platform):</p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1 mb-5">
            <li>Browse behavior — pages visited, search queries, products clicked, time on page.</li>
            <li>Device and browser information for analytics and debugging.</li>
            <li>IP address (used for rate limiting and fraud prevention; not stored permanently).</li>
            <li>Account data if you sign up — email address and display name.</li>
            <li>Optional: wishlists, saved searches, and browsing preferences if you create an account.</li>
          </ul>

          <p className="text-sm font-medium text-neutral-700 mb-2">From sellers (brands connecting their store):</p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Business name, website URL, and contact email.</li>
            <li>Publicly available product data crawled from your website (titles, images, prices, descriptions).</li>
            <li>Crawl logs and sync state — timestamps and status of each product sync.</li>
            <li>Account credentials managed via BetterAuth (passwords are hashed, never stored in plain text).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">3. What we do not collect</h2>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Payment information of any kind — we do not process transactions.</li>
            <li>Sensitive personal data (Aadhaar, PAN, financial details).</li>
            <li>Any data from seller websites beyond publicly accessible product pages.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">4. How we use your data</h2>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>To power search, discovery, and product recommendations on the platform.</li>
            <li>To sync and display seller product catalogs accurately.</li>
            <li>To improve platform performance, fix bugs, and understand usage patterns.</li>
            <li>To send transactional emails — account confirmation, crawl status, and similar.</li>
            <li>We do not sell your personal data to third parties.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">5. Cookies and analytics</h2>
          <p className="text-neutral-600 mb-3">
            We use cookies for session management and analytics. Analytics data is aggregated and
            anonymised — we use it to understand traffic patterns, not to identify individuals.
          </p>
          <p className="text-neutral-600">
            We may use third-party analytics tools (such as Vercel Analytics). These tools collect
            anonymised usage data under their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">6. Advertising</h2>
          <p className="text-neutral-600">
            We may introduce advertising on the platform in the future. If we do, we will update this
            policy to describe what data is used for ad targeting and how you can opt out. We will not
            use sensitive personal data for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">7. Data retention</h2>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Buyer account data is retained until you delete your account.</li>
            <li>Seller product data is retained while your store is connected. Disconnecting removes your catalog from the platform within 30 days.</li>
            <li>Analytics data is retained in aggregated form for up to 24 months.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">8. Third-party websites</h2>
          <p className="text-neutral-600">
            When you click through to a seller's website, you leave Open D2C. That seller's own
            privacy policy applies from that point forward. We are not responsible for how third-party
            websites handle your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">9. Your rights</h2>
          <p className="text-neutral-600 mb-3">
            Under the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023
            (India), you have the right to:
          </p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated personal data.</li>
            <li>Withdraw consent for data processing where consent is the legal basis.</li>
          </ul>
          <p className="text-neutral-600 mt-3">
            To exercise any of these rights, email us at{" "}
            <a href="mailto:legal@opend2c.in" className="text-blue-700 underline underline-offset-2">
              legal@opend2c.in
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">10. Security</h2>
          <p className="text-neutral-600">
            We use industry-standard measures to protect your data — encrypted connections (HTTPS),
            hashed passwords, and access controls on our databases. No system is perfectly secure,
            but we take data protection seriously and will notify affected users promptly in the
            event of a breach.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">11. Changes to this policy</h2>
          <p className="text-neutral-600">
            We may update this Privacy Policy as the platform evolves. Material changes will be
            communicated via a notice on the platform. Continued use after changes are posted
            constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">12. Contact</h2>
          <p className="text-neutral-600">
            Privacy questions or data requests:{" "}
            <a href="mailto:legal@opend2c.in" className="text-blue-700 underline underline-offset-2">
              legal@opend2c.in
            </a>
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-neutral-100">
          Gray Cup Enterprises Private Limited · CIN: U47211DL2025PTC457808 · GST: 06AAMCG4985H1Z4
        </p>
      </div>
    </div>
  );
}
