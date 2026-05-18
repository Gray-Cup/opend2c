import { Metadata } from "next";
import { generateTitle, generateDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: generateTitle("Removal of Content"),
  description: generateDescription(
    "Request removal of your brand or products from Open D2C. DMCA takedown and opt-out process for brands listed on the platform.",
  ),
};

const LAST_UPDATED = "May 2026";

export default function RemovalPage() {
  return (
    <div className="max-w-3xl mx-auto min-h-screen py-10 lg:py-20 px-4">
      <h1 className="text-3xl font-bold text-neutral-800 mb-2">Removal of Content</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-8">

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">1. How We List Brands</h2>
          <p className="text-neutral-600 mb-3">
            Open D2C is a product discovery platform that indexes publicly available product data from
            Indian D2C brand websites — including product titles, images, descriptions, and prices sourced
            from sitemaps and structured data. We operate similarly to a search engine: we do not sell products,
            hold inventory, or process transactions.
          </p>
          <p className="text-neutral-600">
            Some brands on Open D2C were added by us proactively because their products are publicly
            available online. If your brand was listed without your explicit consent and you would like
            it removed, this page explains how to request that.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">2. Brand Opt-Out Request</h2>
          <p className="text-neutral-600 mb-3">
            If you are a brand owner and do not wish your products to appear on Open D2C, you can
            request removal at any time — no reason required. We will process opt-out requests within{" "}
            <strong>5 business days</strong>.
          </p>
          <p className="text-neutral-600 mb-3">To submit an opt-out request, email us at:</p>
          <p className="mb-3">
            <a href="mailto:legal@opend2c.in" className="text-blue-700 underline underline-offset-2 font-medium">
              legal@opend2c.in
            </a>
          </p>
          <p className="text-sm text-neutral-500 mb-3">Include the following in your email:</p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>Your brand name and website URL</li>
            <li>The email address associated with your brand or business</li>
            <li>A brief statement that you are authorised to act on behalf of the brand</li>
            <li>A specific list of URLs or product pages to be removed, or a request to remove the entire brand</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">3. DMCA Takedown Notice</h2>
          <p className="text-neutral-600 mb-3">
            If you believe that content displayed on Open D2C infringes your copyright, you may submit
            a formal DMCA (Digital Millennium Copyright Act) takedown notice. While Open D2C operates
            under Indian law, we respect DMCA takedown requests as a baseline standard for intellectual
            property protection globally.
          </p>
          <p className="text-neutral-600 mb-3">
            A valid DMCA notice must include:
          </p>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1 mb-3">
            <li>
              Your full legal name and contact information (email address, mailing address, and phone number).
            </li>
            <li>
              A description of the copyrighted work you claim has been infringed.
            </li>
            <li>
              The specific URL(s) on Open D2C where the allegedly infringing content appears.
            </li>
            <li>
              A statement that you have a good-faith belief that the use of the material is not authorised
              by the copyright owner, its agent, or the law.
            </li>
            <li>
              A statement that the information in the notice is accurate and, under penalty of perjury,
              that you are the copyright owner or authorised to act on their behalf.
            </li>
            <li>
              Your physical or electronic signature.
            </li>
          </ul>
          <p className="text-neutral-600">
            Send DMCA notices to:{" "}
            <a href="mailto:legal@opend2c.in" className="text-blue-700 underline underline-offset-2">
              legal@opend2c.in
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">4. What Happens After You File</h2>
          <ul className="list-disc pl-5 text-neutral-600 space-y-1">
            <li>We will acknowledge your request within 2 business days.</li>
            <li>
              For opt-out requests, the brand and all associated products will be removed from the platform
              within 5 business days.
            </li>
            <li>
              For DMCA notices, we will review the claim and remove or disable access to the identified
              content promptly if the notice is valid.
            </li>
            <li>
              We may reach out for additional information if the request is incomplete.
            </li>
            <li>
              Once removed, your brand will not be re-indexed by our crawlers unless you actively request
              to be listed again.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">5. Counter-Notification</h2>
          <p className="text-neutral-600">
            If you believe content was removed in error or as a result of misidentification, you may
            send a counter-notification to{" "}
            <a href="mailto:legal@opend2c.in" className="text-blue-700 underline underline-offset-2">
              legal@opend2c.in
            </a>{" "}
            with your name, contact details, identification of the removed content, and a statement under
            penalty of perjury that you have a good-faith belief the content was removed by mistake. We
            will review counter-notifications on a case-by-case basis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">6. Abuse of the Process</h2>
          <p className="text-neutral-600">
            Submitting a false or misleading removal request or DMCA notice may expose you to legal
            liability, including claims for damages and legal costs. We reserve the right to disregard
            notices that are clearly fraudulent, incomplete, or submitted in bad faith.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-800 mb-3">7. Contact</h2>
          <p className="text-neutral-600">
            For all removal, opt-out, and DMCA requests:{" "}
            <a href="mailto:legal@opend2c.in" className="text-blue-700 underline underline-offset-2">
              legal@opend2c.in
            </a>
          </p>
          <p className="text-neutral-600 mt-2">
            For general questions,{" "}
            <a href="/contact" className="text-blue-700 underline underline-offset-2">
              use our contact form
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
