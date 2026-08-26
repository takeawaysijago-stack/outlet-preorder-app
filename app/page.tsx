"use client";

import { useMemo, useState } from "react";
import type { MenuItem } from "@/lib/types";
import LoginGate from "@/components/LoginGate";

// Data contoh sementara — nanti diganti dengan data dari Firestore
// begitu dashboard admin sudah bisa menyimpan menu.
const CONTOH_MENU: MenuItem[] = [
  {
    id: "1",
    nama: "Nasi Ayam Geprek",
    deskripsi: "Ayam goreng tepung, sambal bawang, lalapan",
    harga: 22000,
    kategori: "Makanan Utama",
    tersedia: true,
    addOnGroups: [],
  },
  {
    id: "2",
    nama: "Mie Goreng Spesial",
    deskripsi: "Mie goreng telur, bakso, sosis",
    harga: 20000,
    kategori: "Makanan Utama",
    tersedia: true,
    addOnGroups: [],
  },
  {
    id: "3",
    nama: "Es Teh Manis",
    harga: 6000,
    kategori: "Minuman",
    tersedia: true,
    addOnGroups: [],
  },
  {
    id: "4",
    nama: "Es Jeruk",
    harga: 8000,
    kategori: "Minuman",
    tersedia: false,
    addOnGroups: [],
  },
];

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

export default function HalamanMenu() {
  return <LoginGate>{(user) => <IsiMenu namaUser={user.displayName} />}</LoginGate>;
}

function IsiMenu({ namaUser }: { namaUser: string | null }) {
  const [keranjang, setKeranjang] = useState<Record<string, number>>({});
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);

  const kategoriList = useMemo(() => {
    const set = new Set(CONTOH_MENU.map((m) => m.kategori));
    return Array.from(set);
  }, []);

  const kategoriTampil = kategoriAktif
    ? [kategoriAktif]
    : kategoriList;

  const totalItem = Object.values(keranjang).reduce((a, b) => a + b, 0);
  const totalHarga = Object.entries(keranjang).reduce((sum, [id, qty]) => {
    const item = CONTOH_MENU.find((m) => m.id === id);
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
        <div className="eyebrow">Halo, {namaUser?.split(" ")[0] ?? "Customer"} 👋</div>
        <h1>Mau pesan apa hari ini?</h1>
        <p className="subtitle">Pesan sekarang, tentukan jam ambil, tanpa antre.</p>
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

      {kategoriTampil.map((kategori) => (
        <section key={kategori} className="kategori-section">
          <div className="kategori-title">{kategori}</div>
          {CONTOH_MENU.filter((m) => m.kategori === kategori).map((item) => {
            const qty = keranjang[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className={`menu-card ${!item.tersedia ? "habis" : ""}`}
              >
                <div className="info">
                  <span className="nama">
                    {item.nama}
                    {!item.tersedia && <span className="badge-habis">Habis</span>}
                  </span>
                  {item.deskripsi && (
                    <span className="deskripsi">{item.deskripsi}</span>
                  )}
                  <span className="harga">{formatRupiah(item.harga)}</span>
                </div>

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
