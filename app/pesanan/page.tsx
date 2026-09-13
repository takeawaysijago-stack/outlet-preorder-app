"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoginGate from "@/components/LoginGate";
import WhatsAppGate from "@/components/WhatsAppGate";
import Memuat from "@/components/Memuat";
import { dengarkanPesananSaya, simpanBuktiTransfer } from "@/lib/orderService";
import { kompresGambarKeBase64 } from "@/lib/gambar";
import { QRIS_IMAGE_PATH } from "@/lib/pembayaranConfig";
import { LABEL_STATUS, kodePesanan } from "@/lib/orderLabels";
import { buatLinkWaAdmin } from "@/lib/kontakConfig";
import { IkonCentang, IkonLonceng, IkonSilang, IkonJamPasir, IkonPiring } from "@/components/DoodleIcons";
import { formatTanggalRelatif } from "@/lib/formatTanggal";
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
  if (status === "dibatalkan") {
    return <div className="status-mini batal-mini"><IkonSilang size={18} /></div>;
  }
  if (status === "menunggu_pembayaran") {
    return <div className="status-mini tunggu-mini"><IkonJamPasir size={18} /></div>;
  }
  return null;
}

const TAHAPAN = [
  { key: "dibayar", label: "Diterima", Ikon: IkonCentang },
  { key: "sedang_disiapkan", label: "Disiapkan", Ikon: IkonPiring },
  { key: "siap_diambil", label: "Siap Diambil", Ikon: IkonLonceng },
  { key: "selesai", label: "Selesai", Ikon: IkonCentang },
] as const;

function ProgresPesanan({ status }: { status: string }) {
  if (status === "dibatalkan") {
    return (
      <div className="status-indikator">
        <div className="status-mini batal-mini" style={{ width: 44, height: 44 }}>
          <IkonSilang size={22} />
        </div>
        <span className="status-indikator-teks">Pesanan Dibatalkan</span>
      </div>
    );
  }
  if (status === "menunggu_pembayaran") {
    return (
      <div className="status-indikator">
        <div className="status-mini tunggu-mini" style={{ width: 44, height: 44 }}>
          <IkonJamPasir size={22} />
        </div>
        <span className="status-indikator-teks">Menunggu Pembayaran</span>
      </div>
    );
  }

  const indexAktif = TAHAPAN.findIndex((t) => t.key === status);

  return (
    <div className="progres-track">
      {TAHAPAN.map((t, i) => {
        const kelas = i < indexAktif ? "selesai" : i === indexAktif ? "aktif" : "";
        return (
          <div key={t.key} className={`progres-step ${kelas}`}>
            <div className={`progres-lingkaran ${kelas}`}>
              <t.Ikon size={16} />
            </div>
            <span className={`progres-label ${i <= indexAktif ? "aktif" : ""}`}>
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function HalamanPesananSaya() {
  return (
    <LoginGate>
      {(user) => (
        <WhatsAppGate user={user}>
          {() => <IsiPesananSaya uid={user.uid} />}
        </WhatsAppGate>
      )}
    </LoginGate>
  );
}

function IsiPesananSaya({ uid }: { uid: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [disalinId, setDisalinId] = useState<string | null>(null);

  async function salinNominal(order: Order) {
    try {
      await navigator.clipboard.writeText(String(order.totalTransfer ?? order.totalHarga));
      setDisalinId(order.id);
      setTimeout(() => setDisalinId((id) => (id === order.id ? null : id)), 2500);
    } catch {
      // Kalau clipboard tidak diizinkan browser, biarkan -- masih bisa lihat angkanya manual.
    }
  }

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
        {memuat && <Memuat pesan={["Lagi ambil daftar pesanan kamu…"]} />}
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
                <div>
                  <span className="menu-card-label">
                    {kodePesanan(order)}
                    <span
                      className="badge-habis"
                      style={{ marginLeft: 8, background: warna.bg, color: warna.teks }}
                    >
                      {LABEL_STATUS[order.status]}
                    </span>
                  </span>
                  <div className="tanggal-relatif">{formatTanggalRelatif(order.createdAt)}</div>
                </div>
                <IkonStatusKecil status={order.status} />
              </div>

              <div className="menu-card-value">Ambil jam {formatJam(order.jamAmbil)}</div>
              <div className="menu-card-harga-besar">{formatRupiah(order.totalHarga)}</div>

              {(order.status === "menunggu_pembayaran" ||
                order.status === "menunggu_verifikasi") &&
                order.kodeUnik != null &&
                order.totalTransfer != null && (
                  <div
                    style={{
                      background: "var(--color-accent-soft)",
                      border: "2px solid var(--color-accent)",
                      borderRadius: "var(--radius-md)",
                      padding: "10px 12px",
                      marginTop: 8,
                      marginBottom: 4,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--color-ink-soft)", fontWeight: 600 }}>
                      TRANSFER PAS, JANGAN DIBULATKAN
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "center",
                        gap: 5,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700 }}>
                        {formatRupiah(order.totalTransfer - order.kodeUnik)}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--color-ink-soft)" }}>+</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: "var(--color-accent)" }}>
                        {order.kodeUnik}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--color-ink-soft)" }}>=</span>
                      <span style={{ fontSize: 17, fontWeight: 900 }}>
                        {formatRupiah(order.totalTransfer)}
                      </span>
                    </div>
                    <button
                      onClick={() => salinNominal(order)}
                      style={{
                        marginTop: 8,
                        padding: "7px 14px",
                        borderRadius: "var(--radius-full)",
                        border: "1.5px solid var(--color-ink)",
                        background: disalinId === order.id ? "var(--color-ink)" : "var(--color-card)",
                        color: disalinId === order.id ? "var(--color-card)" : "var(--color-ink)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {disalinId === order.id ? "✓ Tersalin!" : "📋 Salin Nominal"}
                    </button>

                    {order.status === "menunggu_pembayaran" && (
                      <UploadBuktiInline orderId={order.id} />
                    )}
                  </div>
                )}

              <div className="menu-card-divider" />

              <ProgresPesanan status={order.status} />

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

              <a
                href={buatLinkWaAdmin(order)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 10,
                  padding: "9px 14px",
                  borderRadius: "var(--radius-full)",
                  border: "1.5px solid var(--color-ink)",
                  color: "var(--color-ink)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                💬 Hubungi Admin (WA)
              </a>
            </div>
          );
        })}
      </section>
    </main>
  );
}

// Buat customer yang sempat keluar dari layar bayar sebelum sempat upload
// bukti transfer -- di kartu "Pesanan Saya", mereka bisa upload dari sini
// tanpa harus checkout ulang atau kehilangan pesanannya.
function UploadBuktiInline({ orderId }: { orderId: string }) {
  const [buka, setBuka] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function kirim() {
    if (!file) {
      setError("Pilih dulu foto/screenshot bukti transfernya.");
      return;
    }
    setError(null);
    setMengunggah(true);
    try {
      const base64 = await kompresGambarKeBase64(file);
      await simpanBuktiTransfer(orderId, base64);
      // Setelah berhasil, status pesanan otomatis pindah ke
      // "menunggu_verifikasi" lewat listener realtime -- kartu ini akan
      // otomatis berubah tampilan tanpa perlu di-refresh manual.
    } catch (e) {
      const pesan =
        e instanceof Error ? e.message : "Gagal menyimpan bukti transfer. Coba lagi.";
      setError(pesan);
    } finally {
      setMengunggah(false);
    }
  }

  if (!buka) {
    return (
      <button
        onClick={() => setBuka(true)}
        style={{
          marginTop: 8,
          width: "100%",
          padding: "9px 14px",
          borderRadius: "var(--radius-full)",
          border: "2px solid var(--color-ink)",
          background: "var(--color-card)",
          color: "var(--color-ink)",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        📷 Belum Upload Bukti? Upload Sekarang
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, textAlign: "left" }}>
      <img
        src={QRIS_IMAGE_PATH}
        alt="QRIS Pembayaran"
        style={{ maxWidth: 180, width: "100%", margin: "0 auto 10px", display: "block" }}
      />
      <label
        style={{
          display: "block",
          background: "var(--color-card)",
          border: "2px dashed var(--color-accent)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          textAlign: "center",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--color-ink)",
          cursor: "pointer",
        }}
      >
        {file ? `📎 ${file.name}` : "📷 Ketuk untuk pilih foto/screenshot bukti transfer"}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
      </label>

      {error && (
        <p style={{ color: "var(--color-accent)", fontSize: 12.5, marginTop: 6 }}>{error}</p>
      )}

      <button
        onClick={kirim}
        disabled={mengunggah}
        className="checkout-submit"
        style={{ marginTop: 8 }}
      >
        {mengunggah ? "Mengunggah…" : "Kirim Bukti Transfer"}
      </button>
    </div>
  );
}
