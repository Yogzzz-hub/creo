import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Creo - Digital Marketing Agency Platform",
    template: "%s | Creo",
  },
  description:
    "Full-service digital marketing agency helping local businesses grow with weekly content, social media management, and performance marketing.",
  metadataBase: new URL("https://www.getcreo.in"),
  openGraph: {
    title: "Creo - Digital Marketing Agency Platform",
    description:
      "Full-service digital marketing agency helping local businesses grow with weekly content, social media management, and performance marketing.",
    url: "https://www.getcreo.in",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creo - Digital Marketing Agency Platform",
    description:
      "Full-service digital marketing agency helping local businesses grow with weekly content, social media management, and performance marketing.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
      className={cn(
        "h-full antialiased",
        inter.variable,
        jetbrainsMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
