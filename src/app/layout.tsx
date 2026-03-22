import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrthoFlow — AI Physical Therapy",
  description:
    "Browser-based physical therapy with real-time biomechanics tracking. No app download required.",
  keywords: ["physical therapy", "telehealth", "AI", "biomechanics", "mediapipe"],
  openGraph: {
    title: "OrthoFlow",
    description: "AI-powered, webcam-based squat analysis for physical therapy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#0a0a14] text-white">
        {children}
      </body>
    </html>
  );
}
