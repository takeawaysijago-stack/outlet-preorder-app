"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MenuItem } from "@/lib/types";
import LoginGate from "@/components/LoginGate";
import { dengarkanMenu } from "@/lib/menuService";
import AddOnModal from "@/components/AddOnModal";
import { bacaKeranjang, dengarkanKeranjang, hitungHargaLine } from "@/lib/cart";

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
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);
  const [itemDipilih, setItemDipilih] = useState<MenuItem | null>(null);
  const [totalItemKeranjang, setTotalItemKeranjang] = useState(0);
  const [totalHargaKeranjang, setTotalHargaKeranjang] = useState(0);

  useEffect(() => {
    const unsubscribe = dengarkanMenu((items) => {
      setDaftarMenu(items);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function muatUlangKeranjang() {
      const lines = bacaKeranjang();
      setTotalItemKeranjang(lines.reduce((s, l) => s + l.qty, 0));
      setTotalHargaKeranjang(lines.reduce((s, l) => s + hitungHargaLine(l), 0));
    }
    muatUlangKeranjang();
    return dengarkanKeranjang(muatUlangKeranjang);
  }, []);

  const kategoriList = useMemo(() => {
    const set = new Set(daftarMenu.map((m) => m.kategori));
    return Array.from(set);
  }, [daftarMenu]);

  const kategoriTampil = kategoriAktif ? [kategoriAktif] : kategoriList;

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
            .map((item) => (
              <div
                key={item.id}
                className={`menu-card ${!item.tersedia ? "habis" : ""}`}
              >
                <div className="menu-card-value">
                  {item.nama}
                  {!item.tersedia && <span className="badge-habis">Habis</span>}
                </div>

                <div className="menu-card-harga-besar">{formatRupiah(item.harga)}</div>

                {item.deskripsi && (
                  <>
                    <div className="menu-card-divider" />
                    <div className="menu-card-sub">{item.deskripsi}</div>
                  </>
                )}

                <button
                  className="tambah-btn-mengambang"
                  disabled={!item.tersedia}
                  onClick={() => setItemDipilih(item)}
                  aria-label={`Tambah ${item.nama}`}
                >
                  +
                </button>
              </div>
            ))}
        </section>
      ))}

      {totalItemKeranjang > 0 && (
        <div className="cart-float-wrap">
          <Link href="/keranjang" className="cart-float">
            <span className="cart-total">
              {totalItemKeranjang} item
              <small>{formatRupiah(totalHargaKeranjang)}</small>
            </span>
            <span>Lihat Keranjang</span>
          </Link>
        </div>
      )}

      {itemDipilih && (
        <AddOnModal item={itemDipilih} onClose={() => setItemDipilih(null)} />
      )}
    </main>
  );
}
