"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoginGate from "@/components/LoginGate";
import AdminGuard from "@/components/AdminGuard";
import { dengarkanSemuaPesanan, updateStatusPesanan } from "@/lib/orderService";
import type { Order, OrderStatus } from "@/lib/types";

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

const LABEL_STATUS: Record<OrderStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  dibayar: "Sudah Dibayar",
  sedang_disiapkan: "Sedang Disiapkan",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const STATUS_BERIKUTNYA: Partial<Record<OrderStatus, OrderStatus>> = {
  dibayar: "sedang_disiapkan",
  sedang_disiapkan: "siap_diambil",
  siap_diambil: "selesai",
};

function cetakStruk(order: Order) {
  const w = window.open("", "_blank", "width=380,height=600");
  if (!w) return;

  const baris = order.items
    .map((it) => {
      const addOnText = it.addOnDipilih.map((g) => g.optionIds.join(", ")).join(" | ");
      return `
        <div style="margin-bottom:6px;">
          <div>${it.qty}x ${it.namaMenu} — ${formatRupiah(it.hargaSatuan * it.qty)}</div>
          ${addOnText ? `<div style="font-size:11px;color:#555;">${addOnText}</div>` : ""}
          ${it.catatan ? `<div style="font-size:11px;color:#555;">Catatan: ${it.catatan}</div>` : ""}
        </div>`;
    })
    .join("");

  w.document.write(`
    <html>
      <head>
        <title>Struk #${order.id.slice(0, 8).toUpperCase()}</title>
        <style>
          body { font-family: monospace; padding: 16px; font-size: 13px; }
          hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
          h2 { margin: 0; text-align: center; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <h2>Geprek Si Jago</h2>
        <p class="center">Struk Pesanan</p>
        <hr />
        <div>No: #${order.id.slice(0, 8).toUpperCase()}</div>
        <div>Nama: ${order.namaCustomer ?? "-"}</div>
        <div>Jam Ambil: ${formatJam(order.jamAmbil)}</div>
        <hr />
        ${baris}
        <hr />
        <div><b>Total: ${formatRupiah(order.totalHarga)}</b></div>
        <p class="center" style="margin-top:20px;">Terima kasih!</p>
        <script>window.print();</script>
      </body>
    </html>
  `);
  w.document.close();
}

export default function HalamanPesanan() {
  return (
    <LoginGate>
      {(user) => (
        <AdminGuard user={user}>
          <IsiPesanan />
        </AdminGuard>
      )}
    </LoginGate>
  );
}

function IsiPesanan() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "semua">("semua");

  useEffect(() => {
    const unsubscribe = dengarkanSemuaPesanan((data) => {
      setOrders(data);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  const rekapHariIni = useMemo(() => {
    const hariIni = new Date().toDateString();
    const punyaHariIni = orders.filter(
      (o) =>
        new Date(o.createdAt).toDateString() === hariIni &&
        o.status !== "dibatalkan" &&
        o.status !== "menunggu_pembayaran"
    );
    return {
      jumlahPesanan: punyaHariIni.length,
      totalPendapatan: punyaHariIni.reduce((s, o) => s + o.totalHarga, 0),
    };
  }, [orders]);

  const ordersTampil = orders.filter((o) =>
    filter === "semua" ? o.status !== "menunggu_pembayaran" : o.status === filter
  );

  return (
    <main>
      <header className="app-header">
        <div className="eyebrow">Khusus staf</div>
        <h1>Pesanan Masuk</h1>
        <Link
          href="/admin"
          className="tambah-btn-lebar"
          style={{
            display: "inline-block",
            marginTop: 12,
            textDecoration: "none",
            background: "var(--color-ink)",
          }}
        >
          ← Kembali ke Kelola Menu
        </Link>
      </header>

      <section className="kategori-section">
        <div
          style={{
            background: "var(--color-card)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            boxShadow: "var(--shadow-card)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
              Pesanan Hari Ini
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {rekapHariIni.jumlahPesanan}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
              Pendapatan Hari Ini
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>
              {formatRupiah(rekapHariIni.totalPendapatan)}
            </div>
          </div>
        </div>
      </section>

      <nav className="kategori-tabs">
        {(["semua", "dibayar", "sedang_disiapkan", "siap_diambil", "selesai"] as const).map(
          (f) => (
            <button
              key={f}
              className={`kategori-chip ${filter === f ? "aktif" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "semua" ? "Semua" : LABEL_STATUS[f]}
            </button>
          )
        )}
      </nav>

      <section className="kategori-section">
        {memuat && <p style={{ color: "var(--color-ink-soft)" }}>Memuat…</p>}
        {!memuat && ordersTampil.length === 0 && (
          <p style={{ color: "var(--color-ink-soft)" }}>Belum ada pesanan.</p>
        )}

        {ordersTampil.map((order) => {
          const statusBerikutnya = STATUS_BERIKUTNYA[order.status];
          return (
            <div key={order.id} className="menu-card">
              <div className="menu-card-top">
                <span className="menu-card-label">
                  #{order.id.slice(0, 8).toUpperCase()} · {order.namaCustomer ?? "Customer"}
                </span>
                <span
                  className="badge-habis"
                  style={{
                    background:
                      order.status === "selesai" ? "#e4f5e9" : "var(--color-accent-soft)",
                    color: order.status === "selesai" ? "#1a7f37" : "var(--color-accent)",
                  }}
                >
                  {LABEL_STATUS[order.status]}
                </span>
              </div>

              <div className="menu-card-value">Ambil jam {formatJam(order.jamAmbil)}</div>
              <div className="menu-card-harga-besar">{formatRupiah(order.totalHarga)}</div>
              <div className="menu-card-divider" />

              {order.items.map((it, idx) => (
                <div key={idx} className="menu-card-sub" style={{ marginBottom: 4 }}>
                  {it.qty}× {it.namaMenu}
                  {it.catatan ? ` (${it.catatan})` : ""}
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {statusBerikutnya && (
                  <button
                    className="tambah-btn-lebar"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    onClick={() => updateStatusPesanan(order.id, statusBerikutnya)}
                  >
                    Tandai: {LABEL_STATUS[statusBerikutnya]}
                  </button>
                )}
                <button
                  onClick={() => cetakStruk(order)}
                  style={{
                    ...linkBtnStyle,
                    border: "1px solid var(--color-line)",
                    borderRadius: 999,
                    padding: "8px 14px",
                  }}
                >
                  Cetak Struk
                </button>
                {order.status !== "selesai" && order.status !== "dibatalkan" && (
                  <button
                    onClick={() => updateStatusPesanan(order.id, "dibatalkan")}
                    style={{
                      ...linkBtnStyle,
                      border: "1px solid var(--color-line)",
                      borderRadius: 999,
                      padding: "8px 14px",
                    }}
                  >
                    Batalkan
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-accent)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
