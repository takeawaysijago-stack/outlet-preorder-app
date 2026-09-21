"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tab switcher "Menu" <-> "Pesanan Saya" dengan efek "tab folder" -- tab yang
// lagi aktif tampil PUTIH & terangkat (nyambung visual ke kartu-kartu putih
// di bawahnya, dikasih bayangan halus biar kesan "naik"), sedangkan tab yang
// gak aktif tampil pudar transparan (blend ke background, kesannya
// "tenggelam"/gak dipilih). Garis pemisah di bawahnya "terputus" persis di
// tab yang aktif, jadi keliatan seakan-akan isi di bawah itu memang
// "punya" tab yang lagi ditekan.
export default function TabMenuPesanan() {
  const pathname = usePathname();
  const aktif = pathname?.startsWith("/pesanan") ? "pesanan" : "menu";

  const tabs = [
    { key: "menu", href: "/", label: "🍽️ Menu" },
    { key: "pesanan", href: "/pesanan", label: "🧾 Pesanan Saya" },
  ] as const;

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {tabs.map((tab) => {
          const isAktif = aktif === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                flex: 1,
                textAlign: "center",
                textDecoration: "none",
                padding: "10px 12px",
                fontSize: 13.5,
                fontWeight: isAktif ? 800 : 600,
                borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                border: `1.5px solid ${isAktif ? "var(--color-accent)" : "var(--color-line)"}`,
                borderBottomColor: isAktif ? "var(--color-card)" : "var(--color-line)",
                background: isAktif ? "var(--color-card)" : "transparent",
                color: isAktif ? "var(--color-accent)" : "var(--color-ink-soft)",
                marginBottom: -1.5,
                position: "relative",
                zIndex: isAktif ? 2 : 1,
                boxShadow: isAktif ? "0 -3px 10px rgba(23, 19, 16, 0.1)" : "none",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div style={{ borderBottom: "1.5px solid var(--color-line)" }} />
    </div>
  );
}
