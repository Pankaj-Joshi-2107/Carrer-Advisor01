import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'),
  title: "Career Advisor | AI-Powered Career Roadmap Tool",
  description: "Create personalized career roadmaps with our AI-powered career planning tool. Discover skills, milestones and resources needed to achieve your professional goals.",
  keywords: "career advisor, career roadmap, professional development, AI career planning, job skills, career path, career visualization",
  authors: [{ name: "Career Advisor Team" }],
  creator: "Career Advisor",
  publisher: "Career Advisor",
  robots: "index, follow",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_URL,
    title: 'Career Advisor | AI-Powered Career Roadmap Tool',
    description: 'Create personalized career roadmaps with our AI-powered career planning tool.',
    siteName: 'Career Advisor',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Career Advisor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Career Advisor | AI-Powered Career Roadmap Tool',
    description: 'Create personalized career roadmaps with our AI-powered career planning tool.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.svg',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none z-0"></div>
        {children}
      </body>
    </html>
  );
}
