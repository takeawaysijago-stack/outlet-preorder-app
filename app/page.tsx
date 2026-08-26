"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuItem } from "@/lib/types";
import LoginGate from "@/components/LoginGate";
import { dengarkanMenu } from "@/lib/menuService";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function ikonKategori(kategori: string) {
  const k = kategori.toLowerCase();
  if (k.includes("minum")) return "🥤";
  if (k.includes("camilan") || k.includes("snack")) return "🍟";
  return "🍽️";
}

export default function HalamanMenu() {
  return <LoginGate>{(user) => <IsiMenu namaUser={user.displayName} />}</LoginGate>;
}

function IsiMenu({ namaUser }: { namaUser: string | null }) {
  const [daftarMenu, setDaftarMenu] = useState<MenuItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [keranjang, setKeranjang] = useState<Record<string, number>>({});
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = dengarkanMenu((items) => {
      setDaftarMenu(items);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  const kategoriList = useMemo(() => {
    const set = new Set(daftarMenu.map((m) => m.kategori));
    return Array.from(set);
  }, [daftarMenu]);

  const kategoriTampil = kategoriAktif
    ? [kategoriAktif]
    : kategoriList;

  const totalItem = Object.values(keranjang).reduce((a, b) => a + b, 0);
  const totalHarga = Object.entries(keranjang).reduce((sum, [id, qty]) => {
    const item = daftarMenu.find((m) => m.id === id);
    return sum + (item ? item.harga * qty : 0);
  }, 0);

  function ubahQty(id: string, delta: number) {
    setKeranjang((prev) => {
      const qtyBaru = (prev[id] ?? 0) + delta;
      const next = { ...prev };
      if (qtyBaru <= 0) {
        delete next[id];
      } else {
        next[id] = qtyBaru;
      }
      return next;
    });
  }

  return (
    <main>
      <header className="app-header">
        <div className="header-brand-row">
          <img src="/logo.png" alt="Geprek Si Jago" className="brand-logo-kecil" />
          <h1>Halo, {namaUser?.split(" ")[0] ?? "Customer"}</h1>
        </div>
      </header>

      <nav className="kategori-tabs">
        <button
          className={`kategori-chip ${kategoriAktif === null ? "aktif" : ""}`}
          onClick={() => setKategoriAktif(null)}
        >
          Semua
        </button>
        {kategoriList.map((kategori) => (
          <button
            key={kategori}
            className={`kategori-chip ${kategoriAktif === kategori ? "aktif" : ""}`}
            onClick={() => setKategoriAktif(kategori)}
          >
            {kategori}
          </button>
        ))}
      </nav>

      {memuat && (
        <div className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>Memuat menu…</p>
        </div>
      )}

      {!memuat && daftarMenu.length === 0 && (
        <div className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>
            Menu belum tersedia. Silakan cek lagi nanti.
          </p>
        </div>
      )}

      {kategoriTampil.map((kategori) => (
        <section key={kategori} className="kategori-section">
          <div className="kategori-title">{kategori}</div>
          {daftarMenu
            .filter((m) => m.kategori === kategori)
            .map((item) => {
            const qty = keranjang[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className={`menu-card ${!item.tersedia ? "habis" : ""}`}
              >
                <div className="menu-card-top">
                  <span className="menu-card-label">{item.kategori}</span>
                  <span className="menu-card-icon">{ikonKategori(item.kategori)}</span>
                </div>

                <div className="menu-card-value">
                  {item.nama}
                  {!item.tersedia && <span className="badge-habis">Habis</span>}
                </div>

                <div className="menu-card-harga-besar">{formatRupiah(item.harga)}</div>

                {item.deskripsi && (
                  <>
                    <div className="menu-card-divider" />
                    <div className="menu-card-sub">📝 {item.deskripsi}</div>
                  </>
                )}

                <div className="menu-card-footer">
                  {item.tersedia && qty === 0 && (
                    <button
                      className="tambah-btn"
                      onClick={() => ubahQty(item.id, 1)}
                      aria-label={`Tambah ${item.nama}`}
                    >
                      +
                    </button>
                  )}

                  {item.tersedia && qty > 0 && (
                    <div className="stepper">
                      <button onClick={() => ubahQty(item.id, -1)} aria-label="Kurangi">
                        −
                      </button>
                      <span className="qty">{qty}</span>
                      <button onClick={() => ubahQty(item.id, 1)} aria-label="Tambah">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {totalItem > 0 && (
        <div className="cart-float-wrap">
          <div className="cart-float">
            <span className="cart-total">
              {totalItem} item
              <small>{formatRupiah(totalHarga)}</small>
            </span>
            <button>Lihat Keranjang</button>
          </div>
        </div>
      )}
    </main>
  );
}
