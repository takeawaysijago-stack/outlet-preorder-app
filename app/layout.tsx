import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pesan & Ambil",
  description: "Pesan dari rumah, tinggal ambil di outlet — tanpa antre.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#d1451f",
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
      <body className={jakarta.variable}>{children}</body>
    </html>
  );
}
