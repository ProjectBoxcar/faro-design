import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { JourneyCoach } from "@/components/JourneyCoach";
import "./globals.css";

// Faro system: display = EB Garamond; body = system / Inter.
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Faro Design",
  description:
    "Strategy first, then the assets — a clear brand direction and designer-ready package.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F1E8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ebGaramond.variable} h-full antialiased`}
      style={
        {
          "--font-sans":
            '-apple-system, BlinkMacSystemFont, "Segoe UI", var(--font-inter), Roboto, Helvetica, Arial, sans-serif',
          "--font-serif":
            'var(--font-eb-garamond), "EB Garamond", Georgia, "Times New Roman", serif',
          "--font-display":
            'var(--font-eb-garamond), "EB Garamond", Georgia, "Times New Roman", serif',
          "--font-body":
            '-apple-system, BlinkMacSystemFont, "Segoe UI", var(--font-inter), Roboto, Helvetica, Arial, sans-serif',
        } as React.CSSProperties
      }
    >
      <body className="min-h-full font-sans">
        {children}
        <JourneyCoach />
      </body>
    </html>
  );
}
