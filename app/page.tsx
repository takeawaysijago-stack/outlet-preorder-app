"use client";

import { useMemo, useState } from "react";
import type { MenuItem } from "@/lib/types";

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
  const [keranjang, setKeranjang] = useState<Record<string, number>>({});

  const kategoriList = useMemo(() => {
    const set = new Set(CONTOH_MENU.map((m) => m.kategori));
    return Array.from(set);
  }, []);

  const totalItem = Object.values(keranjang).reduce((a, b) => a + b, 0);
  const totalHarga = Object.entries(keranjang).reduce((sum, [id, qty]) => {
    const item = CONTOH_MENU.find((m) => m.id === id);
    return sum + (item ? item.harga * qty : 0);
  }, 0);

  function tambahKeKeranjang(id: string) {
    setKeranjang((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  return (
    <main>
      <header className="receipt-header">
        <div className="eyebrow">Pesan sekarang, ambil tanpa antre</div>
        <h1>Menu Hari Ini</h1>
        <p className="subtitle">
          Pilih menu, tentukan jam ambil, dan bayar dari mana saja.
        </p>
      </header>

      {kategoriList.map((kategori, idx) => (
        <div key={kategori}>
          {idx > 0 && <div className="perforasi" />}
          <section className="kategori-section">
            <div className="kategori-title">{kategori}</div>
            {CONTOH_MENU.filter((m) => m.kategori === kategori).map(
              (item) => (
                <button
                  key={item.id}
                  className="menu-row"
                  disabled={!item.tersedia}
                  onClick={() => tambahKeKeranjang(item.id)}
                  style={{ opacity: item.tersedia ? 1 : 0.5 }}
                >
                  <span className="kolom-nama">
                    <span className="nama">
                      {item.nama}
                      {!item.tersedia && (
                        <span className="badge-habis">Habis</span>
                      )}
                    </span>
                    {item.deskripsi && (
                      <span className="deskripsi">{item.deskripsi}</span>
                    )}
                  </span>
                  <span className="leader" />
                  <span className="harga">{formatRupiah(item.harga)}</span>
                </button>
              )
            )}
          </section>
        </div>
      ))}

      {totalItem > 0 && (
        <div className="cart-bar">
          <span className="cart-total">
            {totalItem} item · {formatRupiah(totalHarga)}
          </span>
          <button>Lihat Keranjang</button>
        </div>
      )}
    </main>
  );
}
