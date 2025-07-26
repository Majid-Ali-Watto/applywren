import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bulk Job Application Sender",
  description:
    "Send personalized resumes and cover letters to multiple employers with a single click. Upload resume, preview email, and streamline your job application workflow.",
  keywords: [
    "job application",
    "bulk email sender",
    "resume sender",
    "cover letter generator",
    "apply to jobs",
    "quill editor",
    "next.js job app",
  ],
  authors: [{ name: "Majid Ali" }],
  creator: "Majid Ali",
  robots: "index, follow",
  openGraph: {
    title: "Bulk Job Application Sender",
    description:
      "A tool to send bulk job applications with customized emails and resumes.",
    url: "https://yourdomain.com",
    siteName: "Bulk Job Application Sender",
    images: [
      {
        url: "https://yourdomain.com/preview.png", // Optional preview image
        width: 1200,
        height: 630,
        alt: "Bulk Job Application Sender",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Job Application Sender",
    description:
      "Send personalized resumes and cover letters in bulk with this Next.js tool.",
    images: ["https://yourdomain.com/preview.png"],
    creator: "@yourtwitterhandle", // Optional
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
