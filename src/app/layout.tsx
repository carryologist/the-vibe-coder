import type { Metadata } from "next";
import { Inter, Space_Grotesk, Fira_Code } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PageViewTracker } from "@/components/PageViewTracker";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
  title: {
    default: "vibescoder",
    template: "%s | vibescoder",
  },
  description:
    "Building in public with AI agents. CEO of Coder.",
  metadataBase: new URL("https://vibescoder.dev"),
  openGraph: {
    title: "vibescoder",
    description: "Building in public with AI agents. CEO of Coder.",
    url: "https://vibescoder.dev",
    siteName: "vibescoder",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "vibescoder",
    description: "Building in public with AI agents. CEO of Coder.",
  },
  icons: {
    icon: [
      { url: "/images/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/branding/favicon-64x64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/images/branding/favicon-180x180.png",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=window.matchMedia("(prefers-color-scheme:light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${spaceGrotesk.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="alternate" type="application/rss+xml" title="vibescoder RSS Feed" href="/feed.xml" />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-16">
          {children}
        </main>
        <Footer />
        <Analytics />
        <PageViewTracker />
      </body>
    </html>
  );
}
