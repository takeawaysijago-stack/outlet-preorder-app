"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tab switcher "Menu" <-> "Pesanan Saya", dipakai bareng di halaman menu (/)
// dan halaman pesanan (/pesanan) supaya kelihatan sebagai satu pasangan tab
// yang sejajar, bukan link kecil yang mengambang terpisah di pojok atas.
export default function TabMenuPesanan() {
  const pathname = usePathname();
  const aktif = pathname?.startsWith("/pesanan") ? "pesanan" : "menu";

  return (
    <nav className="kategori-tabs" style={{ position: "static", paddingBottom: 4 }}>
      <Link
        href="/"
        className={`kategori-chip ${aktif === "menu" ? "aktif" : ""}`}
        style={{ textDecoration: "none" }}
      >
        🍽️ Menu
      </Link>
      <Link
        href="/pesanan"
        className={`kategori-chip ${aktif === "pesanan" ? "aktif" : ""}`}
        style={{ textDecoration: "none" }}
      >
        🧾 Pesanan Saya
      </Link>
    </nav>
  );
}
