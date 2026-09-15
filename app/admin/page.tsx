"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import LoginGate from "@/components/LoginGate";
import AdminGuard from "@/components/AdminGuard";
import Memuat from "@/components/Memuat";
import {
  dengarkanSemuaPesanan,
  updateStatusPesanan,
  verifikasiDanMulaiProses,
  tolakBuktiTransfer,
} from "@/lib/orderService";
import { LABEL_STATUS, STATUS_BERIKUTNYA, kodePesanan } from "@/lib/orderLabels";
import { IkonLonceng, IkonJamPasir } from "@/components/DoodleIcons";
import { formatTanggalRelatif } from "@/lib/formatTanggal";
import { buatLinkWA, buatPesanStatusWA } from "@/lib/whatsapp";
import { dengarkanPengaturan } from "@/lib/settingsService";
import { aktifkanNotifikasiHP, dengarkanPesanForeground } from "@/lib/pushNotif";
import type { Order, OrderStatus, OperationalHours } from "@/lib/types";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function formatJam(iso: string | null) {
  if (!iso) return "Belum ditentukan";
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
        <title>Struk ${kodePesanan(order)}</title>
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
        <div>No: ${kodePesanan(order)}</div>
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
    // 3 nada naik (ting-ting-TING!) pakai gelombang square biar lebih
    // nge-jreng/tajam, bukan bip datar kayak sebelumnya
    const nada = [660, 880, 1175];
    let waktu = ctx.currentTime;
    nada.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, waktu);
      gain.gain.exponentialRampToValueAtTime(0.01, waktu + 0.17);
      osc.start(waktu);
      osc.stop(waktu + 0.18);
      waktu += 0.15;
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    // Browser tidak dukung / belum ada interaksi user -- diamkan saja
  }
}

function IsiPesanan() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [filter, setFilter] = useState<OrderStatus>("menunggu_verifikasi");
  const [alarmPesan, setAlarmPesan] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<{ order: Order; statusBaru: OrderStatus } | null>(
    null
  );
  const idSudahDilihat = useRef<Set<string> | null>(null);
  const idSudahDiingatkanWaktu = useRef<Set<string>>(new Set());
  const intervalAlarm = useRef<ReturnType<typeof setInterval> | null>(null);
  const [jamOps, setJamOps] = useState<OperationalHours>({
    jamMulaiPesan: "09:00",
    jamBuka: "12:00",
    defaultMenitPenyiapan: 15,
  });

  useEffect(() => {
    return dengarkanPengaturan(setJamOps);
  }, []);

  const [statusNotif, setStatusNotif] = useState<string | null>(null);
  const [mengaktifkanNotif, setMengaktifkanNotif] = useState(false);

  useEffect(() => {
    return dengarkanPesanForeground((judul) => {
      // App lagi kebuka -- FCM gak otomatis munculin notifikasi OS, jadi
      // kita pakai alarm yang sudah ada biar tetap kedengeran/keliatan.
      setAlarmPesan(judul);
    });
  }, []);

  async function klikAktifkanNotif() {
    setMengaktifkanNotif(true);
    const hasil = await aktifkanNotifikasiHP();
    setStatusNotif(hasil.pesan);
    setMengaktifkanNotif(false);
  }

  useEffect(() => {
    const unsubscribe = dengarkanSemuaPesanan((data) => {
      const idSemuaSekarang = new Set(data.map((o) => o.id));

      if (idSudahDilihat.current === null) {
        // Pertama kali load, jangan bunyikan alarm buat pesanan yang sudah ada dari awal
        idSudahDilihat.current = idSemuaSekarang;
      } else {
        const adaPesananBaru = [...idSemuaSekarang].some(
          (id) => !idSudahDilihat.current!.has(id)
        );
        if (adaPesananBaru) {
          setAlarmPesan("Pesanan baru masuk!");
        }
        idSudahDilihat.current = idSemuaSekarang;
      }

      setOrders(data);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  // Cek berkala: pesanan yang masih "Sedang Disiapkan" tapi jam ambilnya
  // udah deket -- biar staf keinget buat buruan siapkan sebelum customer
  // datang.
  useEffect(() => {
    const AMBANG_DETIK = 5 * 60; // ingetin 5 menit sebelum jam ambil

    function cek() {
      const sekarang = Date.now();
      for (const o of orders) {
        if (o.status !== "sedang_disiapkan" || !o.jamAmbil) continue;
        if (idSudahDiingatkanWaktu.current.has(o.id)) continue;
        const sisaDetik = (new Date(o.jamAmbil).getTime() - sekarang) / 1000;
        if (sisaDetik <= AMBANG_DETIK) {
          idSudahDiingatkanWaktu.current.add(o.id);
          setAlarmPesan(`Waktu ambil pesanan ${kodePesanan(o)} sudah dekat, segera siapkan!`);
        }
      }
    }

    cek();
    const interval = setInterval(cek, 20000);
    return () => clearInterval(interval);
  }, [orders]);

  useEffect(() => {
    if (alarmPesan) {
      bunyikanBip();
      if (navigator.vibrate) navigator.vibrate([400, 100, 400, 100, 400]);
      intervalAlarm.current = setInterval(() => {
        bunyikanBip();
        if (navigator.vibrate) navigator.vibrate([400, 100, 400, 100, 400]);
      }, 1800);
    }
    return () => {
      if (intervalAlarm.current) clearInterval(intervalAlarm.current);
    };
  }, [alarmPesan]);

  function matikanAlarm() {
    setAlarmPesan(null);
    if (intervalAlarm.current) clearInterval(intervalAlarm.current);
  }

  const rekapHariIni = useMemo(() => {
    const hariIni = new Date().toDateString();
    const punyaHariIni = orders.filter(
      (o) =>
        new Date(o.createdAt).toDateString() === hariIni &&
        o.status !== "dibatalkan" &&
        o.status !== "menunggu_pembayaran" &&
        o.status !== "menunggu_verifikasi"
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

  const ordersTampil = orders.filter((o) =>
    filter === "sedang_disiapkan" ? o.status === "sedang_disiapkan" || o.status === "dibayar" : o.status === filter
  );

  const tabList: { key: OrderStatus; label: string }[] = [
    { key: "menunggu_pembayaran", label: "Belum Bayar" },
    { key: "menunggu_verifikasi", label: "Verifikasi" },
    { key: "sedang_disiapkan", label: "Disiapkan" },
    { key: "siap_diambil", label: "Siap Diambil" },
    { key: "selesai", label: "Selesai" },
  ];

  return (
    <main>
      {alarmPesan && (
        <div className="alarm-banner" onClick={matikanAlarm}>
          <IkonLonceng size={20} /> {alarmPesan} Tap untuk matikan alarm
        </div>
      )}

      <header className="app-header">
        <div className="eyebrow">Khusus staf</div>
        <h1>Pesanan Masuk</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Link
            href="/admin/menu"
            className="tambah-btn-lebar"
            style={{
              display: "inline-block",
              textDecoration: "none",
              background: "var(--color-ink)",
            }}
          >
            Kelola Menu →
          </Link>
          <button
            onClick={klikAktifkanNotif}
            disabled={mengaktifkanNotif}
            className="tambah-btn-lebar"
            style={{ background: "var(--color-accent)" }}
          >
            {mengaktifkanNotif ? "Mengaktifkan…" : "🔔 Aktifkan Notifikasi HP"}
          </button>
        </div>
        {statusNotif && (
          <p style={{ fontSize: 12.5, color: "var(--color-ink-soft)", marginTop: 8 }}>
            {statusNotif}
          </p>
        )}
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
          const jumlah =
            tab.key === "sedang_disiapkan"
              ? (jumlahPerStatus.sedang_disiapkan ?? 0) + (jumlahPerStatus.dibayar ?? 0)
              : jumlahPerStatus[tab.key];
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
        {memuat && <Memuat pesan={["Lagi ambil data pesanan…"]} />}
        {!memuat && ordersTampil.length === 0 && (
          <p style={{ color: "var(--color-ink-soft)" }}>Belum ada pesanan.</p>
        )}

        {ordersTampil.map((order) => {
          const statusBerikutnya = STATUS_BERIKUTNYA[order.status];
          return (
            <div key={order.id} className="menu-card">
              <div className="menu-card-top">
                <div>
                  <span className="menu-card-label">
                    {kodePesanan(order)} · {order.namaCustomer ?? "Customer"}
                  </span>
                  <div className="tanggal-relatif">
                    {formatTanggalRelatif(order.createdAt)} · {formatJam(order.createdAt)}
                  </div>
                </div>
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

              <div className="menu-card-value">
                {order.jamAmbil ? `Ambil jam ${formatJam(order.jamAmbil)}` : "Jam ambil: belum diverifikasi"}
              </div>
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

              {(order.status === "menunggu_verifikasi" ||
                order.status === "menunggu_pembayaran") && (
                <div
                  style={{
                    background: "var(--color-accent-soft)",
                    borderRadius: "var(--radius-lg)",
                    padding: 12,
                    marginTop: 8,
                  }}
                >
                  <div style={{ fontSize: 12.5, color: "var(--color-ink-soft)" }}>
                    Seharusnya masuk sejumlah
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {formatRupiah(order.totalTransfer ?? order.totalHarga)}
                    {" "}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent)" }}>
                      (kode {order.kodeUnik})
                    </span>
                  </div>
                  {order.kodeUnik != null && (
                    <div style={{ fontSize: 11.5, color: "var(--color-ink-soft)", marginTop: 3 }}>
                      Kalau customer transfer dibulatkan (gak pakai kode), coba
                      cari juga nominal <strong>{formatRupiah(order.totalHarga)}</strong> di
                      mutasi -- cocokkan sama nama & jam di atas.
                    </div>
                  )}
                  {order.buktiTransferUrl ? (
                    <a href={order.buktiTransferUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={order.buktiTransferUrl}
                        alt="Bukti transfer"
                        style={{
                          marginTop: 8,
                          width: "100%",
                          maxHeight: 260,
                          objectFit: "contain",
                          borderRadius: 8,
                          background: "#fff",
                        }}
                      />
                    </a>
                  ) : (
                    order.status === "menunggu_pembayaran" && (
                      <div style={{ fontSize: 12, color: "var(--color-ink-soft)", marginTop: 6 }}>
                        Belum ada bukti transfer diupload. Kalau customer bilang
                        sudah transfer lewat WA, cek mutasi manual lalu klik
                        &quot;Verifikasi & Mulai Proses&quot; di bawah.
                      </div>
                    )
                  )}
                </div>
              )}

              {order.jamAmbil && order.status !== "selesai" && order.status !== "dibatalkan" && (
                <CountdownJamAmbil jamAmbil={order.jamAmbil} />
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {order.status === "menunggu_verifikasi" && (
                  <button
                    onClick={() => {
                      if (confirm(`Tolak bukti transfer pesanan ${kodePesanan(order)}? Customer perlu upload ulang.`)) {
                        tolakBuktiTransfer(order.id);
                      }
                    }}
                    style={{
                      ...linkBtnStyle,
                      border: "1px solid var(--color-line)",
                      borderRadius: 999,
                      padding: "8px 14px",
                    }}
                  >
                    Tolak Bukti
                  </button>
                )}
                {statusBerikutnya && (
                  <button
                    className="tambah-btn-lebar"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    onClick={() => setKonfirmasi({ order, statusBaru: statusBerikutnya })}
                  >
                    {statusBerikutnya === "sedang_disiapkan"
                      ? "Verifikasi & Mulai Proses"
                      : `Tandai: ${LABEL_STATUS[statusBerikutnya]}`}
                  </button>
                )}
                {order.noHpCustomer && (
                  <a
                    href={buatLinkWA(order.noHpCustomer, buatPesanStatusWA(order))}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...linkBtnStyle,
                      border: "1px solid #25D366",
                      color: "#1a9e4e",
                      borderRadius: 999,
                      padding: "8px 14px",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    Chat WA
                  </a>
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
                    onClick={() => setKonfirmasi({ order, statusBaru: "dibatalkan" })}
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

      {konfirmasi && (
        <div className="modal-overlay" onClick={() => setKonfirmasi(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>
              {konfirmasi.statusBaru === "dibatalkan"
                ? "Batalkan Pesanan?"
                : konfirmasi.statusBaru === "sedang_disiapkan"
                ? "Verifikasi & Mulai Proses?"
                : "Konfirmasi Status"}
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--color-ink-soft)", marginTop: 6 }}>
              {konfirmasi.statusBaru === "dibatalkan" ? (
                <>
                  Yakin batalkan pesanan{" "}
                  <strong>{kodePesanan(konfirmasi.order)}</strong>? Tindakan ini
                  gak bisa dibalikin lagi.
                </>
              ) : konfirmasi.statusBaru === "sedang_disiapkan" ? (
                <>
                  Pesanan <strong>{kodePesanan(konfirmasi.order)}</strong> mulai
                  diproses sekarang. Jam ambil otomatis diset{" "}
                  <strong>{jamOps.defaultMenitPenyiapan} menit</strong> dari
                  sekarang.
                </>
              ) : (
                <>
                  Yakin ubah pesanan{" "}
                  <strong>{kodePesanan(konfirmasi.order)}</strong> jadi{" "}
                  <strong>{LABEL_STATUS[konfirmasi.statusBaru]}</strong>?
                </>
              )}
            </p>

            <div className="modal-group">
              <div className="modal-group-title">Isi Pesanan</div>
              {konfirmasi.order.items.map((it, idx) => (
                <div key={idx} style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {it.qty}× {it.namaMenu}
                  </div>
                  {(it.addOnDipilih ?? []).map((g) => (
                    <div key={g.groupId} style={{ fontSize: 12.5, color: "var(--color-ink-soft)", paddingLeft: 10 }}>
                      {g.groupJudul ?? ""}: {(g.opsiTerpilih ?? []).map((o) => o.nama).join(", ")}
                    </div>
                  ))}
                  {it.catatan && (
                    <div style={{ fontSize: 12.5, color: "var(--color-ink-soft)", paddingLeft: 10, fontStyle: "italic" }}>
                      Catatan: {it.catatan}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                className="modal-submit"
                style={{ background: "var(--color-ink)", flex: 1, marginTop: 0 }}
                onClick={() => setKonfirmasi(null)}
              >
                Batal
              </button>
              <button
                className="modal-submit"
                style={{
                  flex: 1,
                  marginTop: 0,
                  background:
                    konfirmasi.statusBaru === "dibatalkan" ? "var(--color-accent)" : undefined,
                }}
                onClick={() => {
                  if (konfirmasi.statusBaru === "sedang_disiapkan") {
                    verifikasiDanMulaiProses(konfirmasi.order.id, jamOps.defaultMenitPenyiapan);
                  } else {
                    updateStatusPesanan(konfirmasi.order.id, konfirmasi.statusBaru);
                  }
                  setKonfirmasi(null);
                }}
              >
                {konfirmasi.statusBaru === "dibatalkan"
                  ? "Ya, Batalkan"
                  : konfirmasi.statusBaru === "sedang_disiapkan"
                  ? "Ya, Verifikasi"
                  : "Ya, Yakin"}
              </button>
            </div>
          </div>
        </div>
      )}
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
