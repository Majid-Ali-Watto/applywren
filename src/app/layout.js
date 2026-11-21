import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND_COLOR, DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = `${SITE_NAME} – ${TAGLINE}`;

// Icons (favicon.ico, icon.svg, apple-icon.png), the share image
// (opengraph-image.js), robots.txt, sitemap.xml and the manifest come from
// Next.js file conventions in this folder.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "job application",
    "apply to jobs by email",
    "cover letter",
    "personalized cover letter",
    "resume",
    "recruiter outreach",
    "bulk job applications",
    "application tracker",
  ],
  authors: [{ name: "Majid Ali" }],
  creator: "Majid Ali",
  category: "productivity",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport = {
  themeColor: BRAND_COLOR,
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
};

// Pages render per request so each gets the middleware's CSP nonce.
export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          // Browsers hide nonce values from the DOM once loaded, so the client sees "".
          suppressHydrationWarning
          // Static object defined above; "<" is escaped so it can't close the tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
