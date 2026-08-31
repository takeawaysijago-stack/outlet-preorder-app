import type { Metadata, Viewport } from "next";
import { Manrope, Baloo_2 } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Geprek Si Jago",
  description: "Pesan dari rumah, tinggal ambil di outlet — tanpa antre.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#f2b705",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${manrope.variable} ${baloo.variable}`}>{children}</body>
    </html>
  );
}
