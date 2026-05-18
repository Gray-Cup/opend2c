import { Metadata } from "next";
import { generateTitle, generateDescription } from "@/lib/seo";
import Link from "next/link";
import Image from "next/image";
import { FaGithub, FaLinkedin, FaGlobeAsia, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";

export const metadata: Metadata = {
  title: generateTitle("About"),
  description: generateDescription(
    "Open D2C is a product discovery and search platform for Indian direct-to-consumer brands. Learn about the platform and the team behind it.",
  ),
};

const values = [
  {
    title: "Discovery, not middleman",
    body: "We don't sell products, hold inventory, or take a cut of any sale. We exist purely to help buyers find Indian D2C brands they wouldn't have found otherwise.",
  },
  {
    title: "Free for brands",
    body: "Listing on Open D2C is free. Indian D2C brands shouldn't have to pay to be discoverable. We crawl publicly available data so brands get found without any manual work.",
  },
  {
    title: "Search-first",
    body: "We index every product into Typesense for instant, typo-tolerant search. The experience is closer to a search engine than a traditional marketplace.",
  },
  {
    title: "Seller-controlled",
    body: "Sellers connect their store via our console, can manage visibility, and control which products appear. We don't publish anything a seller doesn't want published.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto min-h-screen py-10 lg:py-20 px-4">
      <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-3">
        About Open D2C
      </h1>
      <p className="text-lg text-muted-foreground mb-4">
        A product discovery platform for Indian direct-to-consumer brands.
      </p>
      <p className="text-sm text-muted-foreground mb-12">
        Open D2C is a platform owned and operated by{" "}
        <a href="https://graycup.in" target="_blank" rel="noopener noreferrer" className="text-neutral-700 underline underline-offset-2">
          Gray Cup Enterprises
        </a>
        .
      </p>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">What we do</h2>
        <p className="text-neutral-600 mb-4">
          India has thousands of independent D2C brands — most of them running on Shopify, most of
          them invisible to buyers who don't already know they exist. Open D2C fixes that.
        </p>
        <p className="text-neutral-600 mb-4">
          We crawl seller websites, index their product catalogs, and make them searchable on a single
          platform. Buyers discover brands, click through to the original website, and purchase directly
          from the brand. We never handle payments or inventory.
        </p>
        <p className="text-neutral-600 mb-4">
          Think of us as a search layer on top of the Indian D2C ecosystem — built for buyers who want
          to discover what's out there, and for brands who want to be found.
        </p>
        <p className="text-neutral-600">
          To keep the platform free and running, we may display advertising in the future. Ads help
          cover server costs and fund ongoing improvements to the platform. Any advertising will be
          clearly labelled and will never affect organic search results.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-800 mb-6">What we believe in</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-5"
            >
              <p className="text-sm font-semibold text-neutral-800 mb-2">{v.title}</p>
              <p className="text-sm text-neutral-600">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-800 mb-6">The team</h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col border border-neutral-200 w-fit rounded-2xl p-4">
            <Image
              src="/arjun.png"
              className="rounded-lg"
              alt="Arjun Aditya"
              height={160}
              width={160}
            />
            <p className="text-sm font-semibold text-neutral-800 mt-3">Arjun Aditya</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Founder & Director</p>
            <div className="flex items-center gap-3">
              <Link className="opacity-60 hover:opacity-100 transition-opacity" target="_blank" href="https://arjunaditya.xyz">
                <FaGlobeAsia size={16} />
              </Link>
              <Link className="opacity-60 hover:opacity-100 transition-opacity" target="_blank" href="https://github.com/nermalcat69">
                <FaGithub size={16} />
              </Link>
              <Link className="opacity-60 hover:opacity-100 transition-opacity" target="_blank" href="https://www.linkedin.com/in/nermalcat69/">
                <FaLinkedin size={16} />
              </Link>
              <Link className="opacity-60 hover:opacity-100 transition-opacity" target="_blank" href="https://x.com/arjunaditya_">
                <FaXTwitter size={16} />
              </Link>
              <Link className="opacity-60 hover:opacity-100 transition-opacity" target="_blank" href="https://instagram.com/arjun_sustains">
                <FaInstagram size={16} />
              </Link>
              <Link className="opacity-60 hover:opacity-100 transition-opacity" target="_blank" href="mailto:arjunaditya@icloud.com">
                <IoIosMail size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">Get involved</h2>
        <p className="text-neutral-600 mb-6">
          We're in early stages. If you run a D2C brand and want to get listed, or if you want to
          partner with us in any capacity, reach out.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/for-sellers"
            className="inline-block rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            List your brand
          </Link>
          <Link
            href="/contact"
            className="inline-block rounded-md border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            Contact us
          </Link>
        </div>
      </section>

      <p className="text-xs text-muted-foreground pt-4 border-t border-neutral-100">
        Open D2C is a platform by Gray Cup Enterprises · Gray Cup Enterprises Private Limited · CIN: U47211DL2025PTC457808 · India
      </p>
    </div>
  );
}
