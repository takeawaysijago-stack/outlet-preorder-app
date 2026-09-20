"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MenuItem } from "@/lib/types";
import LoginGate from "@/components/LoginGate";
import WhatsAppGate from "@/components/WhatsAppGate";
import { dengarkanMenu } from "@/lib/menuService";
import AddOnModal from "@/components/AddOnModal";
import { bacaKeranjang, dengarkanKeranjang, hitungHargaLine } from "@/lib/cart";
import { dengarkanPengaturan } from "@/lib/settingsService";
import { apakahAplikasiBuka } from "@/lib/jamOperasional";
import type { OperationalHours } from "@/lib/types";
import Memuat from "@/components/Memuat";
import TabMenuPesanan from "@/components/TabMenuPesanan";

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
  return (
    <LoginGate>
      {(user) => (
        <WhatsAppGate user={user}>
          {() => <IsiMenu namaUser={user.displayName} />}
        </WhatsAppGate>
      )}
    </LoginGate>
  );
}

function IsiMenu({ namaUser }: { namaUser: string | null }) {
  const [daftarMenu, setDaftarMenu] = useState<MenuItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [itemDipilih, setItemDipilih] = useState<MenuItem | null>(null);
  const [totalItemKeranjang, setTotalItemKeranjang] = useState(0);
  const [totalHargaKeranjang, setTotalHargaKeranjang] = useState(0);
  const [tokoBuka, setTokoBuka] = useState(true);
  const [memuatToko, setMemuatToko] = useState(true);
  const [jamOps, setJamOps] = useState<OperationalHours | null>(null);

  useEffect(() => {
    return dengarkanPengaturan((settings) => {
      setJamOps(settings);
      setTokoBuka(apakahAplikasiBuka(settings));
      setMemuatToko(false);
    });
  }, []);

  // Kalau mode aplikasi "otomatis", status buka/tutup bisa berubah sendiri
  // pas jam tertentu tanpa ada perubahan data di Firestore -- jadi perlu
  // dicek ulang berkala biar layar otomatis kebuka/ketutup tepat waktu.
  useEffect(() => {
    if (!jamOps || jamOps.modeAplikasi !== "otomatis") return;
    const interval = setInterval(() => {
      setTokoBuka(apakahAplikasiBuka(jamOps));
    }, 30_000);
    return () => clearInterval(interval);
  }, [jamOps]);

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

  if (!memuatToko && !tokoBuka) {
    return (
      <div className="layar-tutup">
        <div className="kotak-tutup">
          <img src="/logo.png" alt="Geprek Si Jago" className="brand-logo" style={{ margin: "0 auto 16px" }} />
          <h1>Maaf, Kami Sedang Tutup Sekarang</h1>
          <p className="subtitle" style={{ marginTop: 8 }}>
            Pemesanan belum bisa dilakukan. Coba lagi nanti, ya!
          </p>
        </div>
      </div>
    );
  }

  return (
    <main>
      <header className="app-header">
        <div className="header-brand-row">
          <img src="/logo.png" alt="Geprek Si Jago" className="brand-logo-kecil" />
          <h1>Halo, {namaUser?.split(" ")[0] ?? "Customer"}</h1>
        </div>
      </header>

      <TabMenuPesanan />

      {memuat && (
        <Memuat pesan={["Lagi nyusun menu hari ini…", "Ayam lagi digoreng…"]} />
      )}

      {!memuat && daftarMenu.length === 0 && (
        <div className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>
            Menu belum tersedia. Silakan cek lagi nanti.
          </p>
        </div>
      )}

      {kategoriList.map((kategori) => (
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
