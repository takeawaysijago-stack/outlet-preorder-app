"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoginGate from "@/components/LoginGate";
import { dengarkanPesananSaya } from "@/lib/orderService";
import { LABEL_STATUS } from "@/lib/orderLabels";
import type { Order } from "@/lib/types";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function formatJam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WARNA_STATUS: Record<string, { bg: string; teks: string }> = {
  menunggu_pembayaran: { bg: "var(--color-accent-soft)", teks: "var(--color-accent)" },
  dibayar: { bg: "#fff4d6", teks: "#8a6d00" },
  sedang_disiapkan: { bg: "#fff4d6", teks: "#8a6d00" },
  siap_diambil: { bg: "#e4f5e9", teks: "#1a7f37" },
  selesai: { bg: "#e4f5e9", teks: "#1a7f37" },
  dibatalkan: { bg: "var(--color-accent-soft)", teks: "var(--color-accent)" },
};

function IkonStatusKecil({ status }: { status: string }) {
  if (status === "selesai") {
    return <div className="status-mini selesai-mini">✓</div>;
  }
  if (status === "siap_diambil") {
    return <div className="status-mini siap-mini">🔔</div>;
  }
  if (status === "dibayar" || status === "sedang_disiapkan") {
    return <div className="status-mini spinner-mini" />;
  }
  if (status === "dibatalkan") {
    return <div className="status-mini batal-mini">✕</div>;
  }
  if (status === "menunggu_pembayaran") {
    return <div className="status-mini tunggu-mini">⏳</div>;
  }
  return null;
}

function TeksStatus({ status }: { status: string }) {
  const teks: Record<string, string> = {
    dibayar: "Menunggu Diproses…",
    sedang_disiapkan: "Sedang Disiapkan…",
    siap_diambil: "Siap Diambil di Outlet!",
    selesai: "Pesanan Selesai",
    dibatalkan: "Pesanan Dibatalkan",
    menunggu_pembayaran: "Menunggu Pembayaran",
  };
  if (!teks[status]) return null;
  return <div className="status-indikator-teks" style={{ textAlign: "center" }}>{teks[status]}</div>;
}

export default function HalamanPesananSaya() {
  return <LoginGate>{(user) => <IsiPesananSaya uid={user.uid} />}</LoginGate>;
}

function IsiPesananSaya({ uid }: { uid: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    const unsubscribe = dengarkanPesananSaya(uid, (data) => {
      setOrders(data);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, [uid]);

  return (
    <main>
      <header className="app-header">
        <h1>Pesanan Saya</h1>
        <Link
          href="/"
          className="tambah-btn-lebar"
          style={{
            display: "inline-block",
            marginTop: 12,
            textDecoration: "none",
            background: "var(--color-ink)",
          }}
        >
          ← Kembali ke Menu
        </Link>
      </header>

      <section className="kategori-section">
        {memuat && <p style={{ color: "var(--color-ink-soft)" }}>Memuat…</p>}
        {!memuat && orders.length === 0 && (
          <p style={{ color: "var(--color-ink-soft)" }}>
            Belum ada pesanan. Yuk pesan menu dulu!
          </p>
        )}

        {orders.map((order) => {
          const warna = WARNA_STATUS[order.status] ?? WARNA_STATUS.dibayar;
          return (
            <div key={order.id} className="menu-card">
              <div className="menu-card-top">
                <span className="menu-card-label">
                  #{order.id.slice(0, 8).toUpperCase()}
                  <span
                    className="badge-habis"
                    style={{ marginLeft: 8, background: warna.bg, color: warna.teks }}
                  >
                    {LABEL_STATUS[order.status]}
                  </span>
                </span>
                <IkonStatusKecil status={order.status} />
              </div>

              <div className="menu-card-value">Ambil jam {formatJam(order.jamAmbil)}</div>
              <div className="menu-card-harga-besar">{formatRupiah(order.totalHarga)}</div>
              <div className="menu-card-divider" />

              <TeksStatus status={order.status} />

              <div className="menu-card-divider" />

              {order.items.map((it, idx) => (
                <div key={idx} style={{ marginBottom: 8 }}>
                  <div className="menu-card-sub" style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                    {it.qty}× {it.namaMenu}
                  </div>
                  {(it.addOnDipilih ?? []).map((g) => (
                    <div key={g.groupId} className="menu-card-sub" style={{ paddingLeft: 12 }}>
                      {g.groupJudul ?? ""}: {(g.opsiTerpilih ?? []).map((o) => o.nama).join(", ")}
                    </div>
                  ))}
                  {it.catatan && (
                    <div className="menu-card-sub" style={{ paddingLeft: 12, fontStyle: "italic" }}>
                      Catatan: {it.catatan}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </main>
  );
}
