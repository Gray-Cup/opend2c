import { Metadata } from "next";
import { generateTitle, generateDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: generateTitle("Terms of Use"),
  description: generateDescription(
    "Terms of Use for the Open D2C marketplace — a free product discovery platform for Indian D2C brands.",
  ),
};

const LAST_UPDATED = "May 2026";

export default function TermsOfUse() {
  return (
    <div className="max-w-3xl mx-auto min-h-screen py-10 lg:py-20 px-4">
      <h1 className="text-3xl font-bold text-neutral-800 mb-2">Terms of Use</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-8">

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">1. What Open D2C Is</h2>
          <p className="text-neutral-600 mb-3">
            Open D2C is a product discovery and aggregation platform for Indian direct-to-consumer (D2C)
            brands, owned and operated by Gray Cup Enterprises (Gray Cup Enterprises Private Limited).
            We index publicly available product data from seller websites — sitemaps, product feeds,
            and structured data — and surface it in a searchable marketplace.
          </p>
          <p className="text-neutral-600">
            <strong>We do not sell products.</strong> We do not process payments. We do not hold inventory.
            When you find a product on Open D2C, you are redirected to the original brand's website to complete
            your purchase. The transaction is entirely between you and that brand.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">2. Acceptance of Terms</h2>
          <p className="text-neutral-600">
            By accessing or using Open D2C — whether as a buyer browsing products or a seller listing
            your brand — you agree to these Terms of Use. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">3. Free Listing for Brands</h2>
          <p className="text-neutral-600 mb-3">
            Listing your D2C brand and products on Open D2C is <strong>free</strong>. There are no
            upfront fees, no listing fees, and no commission charged on any purchase — because we are a
            discovery platform, not a marketplace that processes transactions.
          </p>
          <p className="text-neutral-600">
            We may introduce optional paid tiers in the future — such as priority placement, verified
            brand badges, or enhanced analytics — but the core listing will always remain free. You will
            be notified of any changes before they take effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">4. Advertising Disclosure</h2>
          <p className="text-neutral-600 mb-3">
            Open D2C may display advertising on its pages. Advertising revenue helps cover the platform's
            server costs and funds ongoing improvements — it is how we keep the core product free for
            brands and buyers. This may include:
          </p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1 mb-3">
            <li>Sponsored brand or product placements</li>
            <li>Banner or display advertisements</li>
            <li>Promoted search results</li>
          </ul>
          <p className="text-neutral-600">
            Any paid or sponsored content will be clearly labelled as such. Advertising relationships
            do not influence editorial decisions, product indexing, or organic search ranking.
            If and when advertising is introduced, this section will be updated with specific disclosures.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">5. Product Data and Accuracy</h2>
          <p className="text-neutral-600 mb-3">
            Product information on Open D2C — including titles, images, descriptions, and prices — is
            sourced automatically from publicly available data on seller websites. We do not manually
            verify every listing.
          </p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Prices may differ from what you see on the seller's website at the time of purchase.</li>
            <li>Product availability is controlled entirely by the seller.</li>
            <li>Images are fetched from seller websites and may change without notice.</li>
            <li>We are not responsible for errors or outdated information originating from seller sources.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">6. Seller Responsibilities</h2>
          <p className="text-neutral-600 mb-3">By connecting your store to Open D2C, you confirm that:</p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>You own or have the right to list the products on your website.</li>
            <li>Your product information is accurate and does not violate any laws or third-party rights.</li>
            <li>You will honour the prices, availability, and descriptions displayed on your website.</li>
            <li>You are solely responsible for order fulfilment, customer service, and returns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">7. Buyer Responsibilities</h2>
          <p className="text-neutral-600">
            Open D2C is a discovery layer. When you click through to a seller's website, that seller's
            own terms of service, privacy policy, and return policy apply. We are not party to any
            transaction between you and a seller, and we have no liability for any purchase you make
            on a third-party website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">8. Intellectual Property</h2>
          <p className="text-neutral-600 mb-3">
            The Open D2C platform, its design, code, and branding are the property of Open D2C
            Enterprises Private Limited. Product content (names, images, descriptions) remains the
            property of the respective sellers.
          </p>
          <p className="text-neutral-600">
            You may not scrape, reproduce, or redistribute content from Open D2C without prior
            written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">9. Prohibited Use</h2>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Using the platform for any unlawful purpose.</li>
            <li>Attempting to gain unauthorised access to our systems or seller data.</li>
            <li>Submitting false or misleading brand or product information.</li>
            <li>Automated scraping of our platform beyond what is publicly permitted.</li>
            <li>Misrepresenting your affiliation with any brand or seller.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">10. Limitation of Liability</h2>
          <p className="text-neutral-600">
            To the maximum extent permitted by applicable law, Gray Cup Enterprises Private Limited
            shall not be liable for any indirect, incidental, or consequential damages arising from
            your use of the platform, including any reliance on product data displayed here or any
            transaction with a seller you discovered through Open D2C.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">11. Changes to These Terms</h2>
          <p className="text-neutral-600">
            We may update these Terms of Use at any time. Material changes will be communicated via
            a notice on the platform. Your continued use after changes are posted constitutes acceptance
            of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">12. Governing Law</h2>
          <p className="text-neutral-600">
            These Terms are governed by the laws of India. Any disputes shall be subject to the
            exclusive jurisdiction of the courts in New Delhi, India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">13. Contact</h2>
          <p className="text-neutral-600">
            Questions about these Terms?{" "}
            <a href="/contact" className="text-blue-700 underline underline-offset-2">
              Get in touch
            </a>
            .
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-neutral-100">
          Gray Cup Enterprises Private Limited · CIN: U47211DL2025PTC457808 · GST: 06AAMCG4985H1Z4
        </p>
      </div>
    </div>
  );
}
