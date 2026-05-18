import { Metadata } from "next";
import { generateTitle, generateDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: generateTitle("Impressum"),
  description: generateDescription(
    "Legal disclosure and company information for Gray Cup Enterprises Private Limited including registration details, GST and contact information.",
  ),
};

export default function Impressum() {
  return (
    <div className="max-w-3xl mx-auto min-h-screen py-3 sm:md-py-5 md:py-10 lg:py-20 ">
      <h1 className="text-3xl font-bold text-neutral-800 mb-6">Impressum</h1>

      <div className="prose prose-neutral">
        <p className="text-muted-foreground mb-6">Legal Disclosure</p>

        <h2 className="text-xl font-semibold text-neutral-800 mt-8 mb-4">
          Company Information
        </h2>

        <div className="mb-6 space-y-3">
          <p>
            <strong>Legal Name:</strong> Gray Cup Enterprises Private Limited
          </p>
          <p>
            <strong>Registered Address:</strong> FF122, Rodeo Drive Mall, GT
            Road, TDI City, Kundli, Sonipat, Haryana, 131030
          </p>
          <p>
            <strong>Country:</strong> India / Bharat
          </p>
          <p>
            <strong>Incorporation Date:</strong> 7th November, 2025
          </p>
        </div>

        <h2 className="text-xl font-semibold text-neutral-800 mt-8 mb-4">
          Registration Details
        </h2>

        <div className="mb-6 space-y-3">
          <p>
            <strong>Corporate Identification Number (CIN):</strong>{" "}
            <code className="bg-neutral-100 px-2 py-1 rounded text-sm">
              U47211DL2025PTC457808
            </code>
          </p>
          <p>
            <strong>GST Identification Number:</strong>{" "}
            <code className="bg-neutral-100 px-2 py-1 rounded text-sm">
              06AAMCG4985H1Z4
            </code>
          </p>
        </div>

        <h2 className="text-xl font-semibold text-neutral-800 mt-8 mb-4">
          Payment Information
        </h2>

        <div className="mb-6 space-y-3">
          <p>
            <strong>UPI ID:</strong>{" "}
            <code className="bg-neutral-100 px-2 py-1 rounded text-sm">
              graycup@kotak
            </code>
          </p>
        </div>

        <h2 className="text-xl font-semibold text-neutral-800 mt-8 mb-4">
          Contact
        </h2>
        <p className="mb-4">
          For any inquiries, please reach out to us through our{" "}
          <a href="/contact" className="text-blue-700 underline">
            contact page
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold text-neutral-800 mt-8 mb-4">
          Disclaimer
        </h2>
        <p className="mb-4">
          The information provided on this website is for general informational
          purposes only. While we strive to keep the information up to date and
          accurate, we make no representations or warranties of any kind,
          express or implied, about the completeness, accuracy, reliability, or
          availability of the information, products, services, or related
          graphics contained on the website.
        </p>

        <p className="text-sm text-muted-foreground mt-10">
          This page fulfills legal disclosure requirements for transparency
          about our company.
        </p>
      </div>
    </div>
  );
}
