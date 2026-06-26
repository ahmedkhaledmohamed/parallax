import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Parallax — Same reviews, your viewpoint",
  description:
    "See what a restaurant's rating actually means for what you care about.",
  manifest: "/manifest.json",
  themeColor: "#d97706",
  openGraph: {
    title: "Parallax",
    description:
      "Same reviews, your viewpoint. See what a restaurant's rating actually means for what you care about.",
    type: "website",
    siteName: "Parallax",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary",
    title: "Parallax — Same reviews, your viewpoint",
    description:
      "Personalized restaurant review re-scoring. See what matters to you.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Parallax",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </body>
    </html>
  );
}
