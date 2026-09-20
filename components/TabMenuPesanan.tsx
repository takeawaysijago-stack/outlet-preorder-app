"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tab switcher "Menu" <-> "Pesanan Saya" dengan efek "tab folder" -- tab yang
// lagi aktif background-nya nyambung sama warna halaman di bawahnya (garis
// pemisah "terputus" persis di tab yang aktif), jadi keliatan seakan-akan isi
// di bawah itu memang "punya" tab yang lagi ditekan. Tab yang gak aktif
// keliatan seperti kotak terpisah/tertutup.
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
                fontWeight: 700,
                borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                border: "1.5px solid var(--color-line)",
                borderBottomColor: isAktif ? "var(--color-bg)" : "var(--color-line)",
                background: isAktif ? "var(--color-bg)" : "var(--color-card)",
                color: isAktif ? "var(--color-ink)" : "var(--color-ink-soft)",
                marginBottom: -1.5,
                position: "relative",
                zIndex: isAktif ? 2 : 1,
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
