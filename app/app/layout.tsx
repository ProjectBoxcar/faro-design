import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Apple UI is SF throughout. On Apple devices we get the real San Francisco via
// -apple-system / system-ui; elsewhere (Windows) Inter is the closest free stand-in.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Brand App",
  description: "Finisterra methodology workspace — concept to designer handover",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // exposes env(safe-area-inset-*) for notches/home indicator
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      style={
        {
          // Prefer real SF on Apple platforms, fall back to Inter, then platform sans.
          "--font-sans":
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", var(--font-inter), "Segoe UI", system-ui, sans-serif',
          "--font-serif":
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", var(--font-inter), "Segoe UI", system-ui, sans-serif',
        } as React.CSSProperties
      }
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
