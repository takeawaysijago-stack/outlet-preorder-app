"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import LoginGate from "@/components/LoginGate";
import AdminGuard from "@/components/AdminGuard";
import { dengarkanSemuaPesanan, updateStatusPesanan } from "@/lib/orderService";
import { LABEL_STATUS, STATUS_BERIKUTNYA } from "@/lib/orderLabels";
import { IkonLonceng, IkonJamPasir } from "@/components/DoodleIcons";
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

function cetakStruk(order: Order) {
  const w = window.open("", "_blank", "width=380,height=600");
  if (!w) return;

  const baris = order.items
    .map((it) => {
      const addOnText = it.addOnDipilih
        .map((g) => `${g.groupJudul ?? ""}: ${(g.opsiTerpilih ?? []).map((o) => o.nama).join(", ")}`)
        .join(" | ");
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

function CountdownJamAmbil({ jamAmbil }: { jamAmbil: string }) {
  const [sisaDetik, setSisaDetik] = useState(() =>
    Math.round((new Date(jamAmbil).getTime() - Date.now()) / 1000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSisaDetik(Math.round((new Date(jamAmbil).getTime() - Date.now()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [jamAmbil]);

  const kritis = sisaDetik <= 5 * 60;

  let teks: string;
  if (sisaDetik <= 0) {
    teks = "Waktu ambil terlewat!";
  } else {
    const jam = Math.floor(sisaDetik / 3600);
    const menit = Math.floor((sisaDetik % 3600) / 60);
    const detik = sisaDetik % 60;
    if (jam > 0) {
      teks = `${jam}j ${menit}m lagi`;
    } else {
      teks = `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")} lagi`;
    }
  }

  return (
    <div className={`countdown-box ${kritis ? "kritis" : ""}`}>
      <IkonJamPasir size={18} />
      {teks}
    </div>
  );
}

export default function HalamanAdmin() {
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

function bunyikanBip() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    // Browser tidak dukung / belum ada interaksi user -- diamkan saja
  }
}

function IsiPesanan() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [filter, setFilter] = useState<OrderStatus>("dibayar");
  const [alarmAktif, setAlarmAktif] = useState(false);
  const idSudahDilihat = useRef<Set<string> | null>(null);
  const intervalAlarm = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsubscribe = dengarkanSemuaPesanan((data) => {
      const idDibayarSekarang = new Set(
        data.filter((o) => o.status === "dibayar").map((o) => o.id)
      );

      if (idSudahDilihat.current === null) {
        // Pertama kali load, jangan bunyikan alarm buat pesanan yang sudah ada dari awal
        idSudahDilihat.current = idDibayarSekarang;
      } else {
        const adaPesananBaru = [...idDibayarSekarang].some(
          (id) => !idSudahDilihat.current!.has(id)
        );
        if (adaPesananBaru) {
          setAlarmAktif(true);
        }
        idSudahDilihat.current = idDibayarSekarang;
      }

      setOrders(data);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (alarmAktif) {
      bunyikanBip();
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      intervalAlarm.current = setInterval(() => {
        bunyikanBip();
        if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      }, 2500);
    }
    return () => {
      if (intervalAlarm.current) clearInterval(intervalAlarm.current);
    };
  }, [alarmAktif]);

  function matikanAlarm() {
    setAlarmAktif(false);
    if (intervalAlarm.current) clearInterval(intervalAlarm.current);
  }

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

  // Hitung jumlah pesanan per status, buat badge angka di tiap tab
  const jumlahPerStatus = useMemo(() => {
    const hasil: Partial<Record<OrderStatus, number>> = {};
    for (const o of orders) {
      hasil[o.status] = (hasil[o.status] ?? 0) + 1;
    }
    return hasil;
  }, [orders]);

  const ordersTampil = orders.filter((o) => o.status === filter);

  const tabList: { key: OrderStatus; label: string }[] = [
    { key: "dibayar", label: "Pesanan Masuk" },
    { key: "sedang_disiapkan", label: "Disiapkan" },
    { key: "siap_diambil", label: "Siap Diambil" },
    { key: "selesai", label: "Selesai" },
  ];

  return (
    <main>
      {alarmAktif && (
        <div className="alarm-banner" onClick={matikanAlarm}>
          <IkonLonceng size={20} /> Pesanan baru masuk! Tap untuk matikan alarm
        </div>
      )}

      <header className="app-header">
        <div className="eyebrow">Khusus staf</div>
        <h1>Pesanan Masuk</h1>
        <Link
          href="/admin/menu"
          className="tambah-btn-lebar"
          style={{
            display: "inline-block",
            marginTop: 12,
            textDecoration: "none",
            background: "var(--color-ink)",
          }}
        >
          Kelola Menu →
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
        {tabList.map((tab) => {
          const jumlah = jumlahPerStatus[tab.key];
          return (
            <button
              key={tab.key}
              className={`kategori-chip ${filter === tab.key ? "aktif" : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              {!!jumlah && <span className="chip-badge">{jumlah}</span>}
            </button>
          );
        })}
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

              {order.status !== "selesai" && order.status !== "dibatalkan" && (
                <CountdownJamAmbil jamAmbil={order.jamAmbil} />
              )}

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
