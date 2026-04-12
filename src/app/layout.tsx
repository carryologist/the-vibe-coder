import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Vibes Coder",
    template: "%s | Vibes Coder",
  },
  description:
    "Thoughts on software development, AI-assisted coding, and the craft of building software.",
  metadataBase: new URL("https://vibescoder.dev"),
  openGraph: {
    title: "Vibes Coder",
    description: "Thoughts on software development, AI-assisted coding, and the craft of building software.",
    url: "https://vibescoder.dev",
    siteName: "Vibes Coder",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibes Coder",
    description: "Thoughts on software development, AI-assisted coding, and the craft of building software.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
