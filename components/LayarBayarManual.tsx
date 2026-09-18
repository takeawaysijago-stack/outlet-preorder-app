"use client";

import { useState } from "react";
import { simpanBuktiTransfer } from "@/lib/orderService";
import { kompresGambarKeBase64 } from "@/lib/gambar";
import { QRIS_IMAGE_PATH } from "@/lib/pembayaranConfig";
import { kodePesanan } from "@/lib/orderLabels";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

export default function LayarBayarManual({
  orderId,
  kodeUnik,
  totalTransfer,
  onSelesai,
}: {
  orderId: string;
  kodeUnik: number;
  totalTransfer: number;
  onSelesai: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  const totalDasar = totalTransfer - kodeUnik;

  async function salinNominal() {
    try {
      await navigator.clipboard.writeText(String(totalTransfer));
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      // Kalau browser tidak izinkan akses clipboard, biarkan saja --
      // customer masih bisa ketik manual lihat angkanya di layar.
    }
  }

  async function kirimBukti() {
    if (!file) {
      setError("Pilih dulu foto/screenshot bukti transfernya.");
      return;
    }
    setError(null);
    setMengunggah(true);
    try {
      const base64 = await kompresGambarKeBase64(file);
      await simpanBuktiTransfer(orderId, base64);
      setSukses(true);
    } catch (e) {
      const pesan =
        e instanceof Error ? e.message : "Gagal menyimpan bukti transfer. Coba lagi.";
      setError(pesan);
    } finally {
      setMengunggah(false);
    }
  }

  if (sukses) {
    return (
      <main>
        <header className="app-header">
          <h1>Bukti Terkirim 🎉</h1>
          <p className="subtitle">
            Nomor pesanan kamu: <strong>{kodePesanan({ id: orderId, kodeUnik })}</strong>
          </p>
        </header>
        <section className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)", fontSize: 13.5 }}>
            Bukti transfer sudah kami terima. Tunggu sebentar, outlet akan
            verifikasi pembayaran secara manual lalu mulai siapkan pesananmu.
          </p>
          <button className="checkout-submit" onClick={onSelesai} style={{ marginTop: 16 }}>
            Lihat Pesanan Saya
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="app-header">
        <h1>Selesaikan Pembayaran</h1>
        <p className="subtitle">
          Nomor pesanan: <strong>{kodePesanan({ id: orderId, kodeUnik })}</strong>
        </p>
      </header>

      <section className="kategori-section">
        <div
          style={{
            background: "var(--color-card)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            boxShadow: "var(--shadow-card)",
            textAlign: "center",
          }}
        >
          <img
            src={QRIS_IMAGE_PATH}
            alt="QRIS Pembayaran"
            style={{ maxWidth: 260, width: "100%", margin: "0 auto" }}
          />
          <a
            href={QRIS_IMAGE_PATH}
            download="qris-geprek-si-jago.jpg"
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              border: "1.5px solid var(--color-ink)",
              color: "var(--color-ink)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ⬇ Unduh QRIS
          </a>
        </div>

        {/* Nominal: satu angka besar yang jelas, rincian cuma keterangan kecil di
            bawahnya -- biar gak ada banyak angka merah gede yang bikin bingung. */}
        <div
          style={{
            marginTop: 14,
            background: "var(--color-card)",
            border: "2px solid var(--color-ink)",
            borderRadius: "var(--radius-lg)",
            padding: 18,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--color-ink-soft)", fontWeight: 600 }}>
            Jumlah yang harus ditransfer
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--color-accent)", marginTop: 4 }}>
            {formatRupiah(totalTransfer)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-ink-soft)", marginTop: 4 }}>
            ({formatRupiah(totalDasar)} + kode unik {kodeUnik})
          </div>

          <button
            onClick={salinNominal}
            style={{
              marginTop: 14,
              padding: "10px 18px",
              borderRadius: "var(--radius-full)",
              border: "1.5px solid var(--color-ink)",
              background: tersalin ? "var(--color-ink)" : "var(--color-card)",
              color: tersalin ? "var(--color-card)" : "var(--color-ink)",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tersalin ? "✓ Tersalin!" : `📋 Salin Nominal: ${formatRupiah(totalTransfer)}`}
          </button>
        </div>

        <div
          style={{
            marginTop: 10,
            background: "#fff3cd",
            border: "1.5px solid #f0ad4e",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
            fontSize: 12.5,
            color: "#6b4a00",
          }}
        >
          ⚠️ Wajib transfer PAS <strong>{formatRupiah(totalTransfer)}</strong>,
          jangan dibulatkan ke {formatRupiah(totalDasar)} -- pakai tombol
          salin di atas biar gak salah ketik.
        </div>

        <div className="modal-group-title" style={{ marginTop: 20 }}>
          Upload Bukti Transfer
        </div>
        <label
          style={{
            display: "block",
            background: "var(--color-card)",
            border: "2px dashed var(--color-accent)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            textAlign: "center",
            fontSize: 13.5,
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
          <p style={{ color: "var(--color-accent)", fontSize: 13, marginTop: 8 }}>
            {error}
          </p>
        )}

        <button
          className="checkout-submit"
          disabled={mengunggah}
          onClick={kirimBukti}
        >
          {mengunggah ? "Mengunggah…" : "Kirim Bukti Transfer"}
        </button>

        <p style={{ fontSize: 11.5, color: "var(--color-ink-soft)", marginTop: 14, textAlign: "center" }}>
          Belum sempat bayar? Aman, halaman ini bisa kamu buka lagi kapan
          saja lewat menu <strong>Pesanan Saya</strong>.
        </p>
      </section>
    </main>
  );
}
