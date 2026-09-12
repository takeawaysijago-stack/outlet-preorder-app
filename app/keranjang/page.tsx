"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoginGate from "@/components/LoginGate";
import {
  bacaKeranjang,
  dengarkanKeranjang,
  hapusDariKeranjang,
  hitungHargaLine,
  kosongkanKeranjang,
  updateQtyKeranjang,
  type CartLine,
} from "@/lib/cart";
import { buatPesanan, simpanBuktiTransfer } from "@/lib/orderService";
import { dengarkanPengaturan } from "@/lib/settingsService";
import { REKENING_BRI, QRIS_IMAGE_PATH } from "@/lib/pembayaranConfig";
import type { OrderItem, OperationalHours } from "@/lib/types";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// Generate slot jam ambil berdasarkan pengaturan admin:
// - Waktu tersaran default = waktu sekarang + defaultMenitPenyiapan,
//   TAPI tidak boleh lebih awal dari jam buka outlet hari ini.
// - Slot dibuat tiap 15 menit, dimulai dari waktu tersaran itu.
function generateSlotJam(settings: OperationalHours): { label: string; iso: string }[] {
  const sekarang = new Date();
  const [jamBukaH, jamBukaM] = settings.jamBuka.split(":").map(Number);

  const jamBukaHariIni = new Date(sekarang);
  jamBukaHariIni.setHours(jamBukaH, jamBukaM, 0, 0);

  const usulan = new Date(
    sekarang.getTime() + settings.defaultMenitPenyiapan * 60 * 1000
  );

  let mulai = usulan < jamBukaHariIni ? jamBukaHariIni : usulan;
  mulai = new Date(mulai);
  mulai.setMinutes(Math.ceil(mulai.getMinutes() / 15) * 15, 0, 0);

  const slots: { label: string; iso: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const waktu = new Date(mulai.getTime() + i * 15 * 60 * 1000);
    slots.push({
      label: waktu.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      iso: waktu.toISOString(),
    });
  }
  return slots;
}

type OrderBayar = {
  id: string;
  kodeUnik: number;
  totalTransfer: number;
};

export default function HalamanKeranjang() {
  return <LoginGate>{(user) => <IsiKeranjang user={user} />}</LoginGate>;
}

function IsiKeranjang({ user }: { user: { uid: string; displayName: string | null } }) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [jamAmbil, setJamAmbil] = useState("");
  const [noHp, setNoHp] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderBayar, setOrderBayar] = useState<OrderBayar | null>(null);

  const [jamOps, setJamOps] = useState<OperationalHours>({
    jamMulaiPesan: "09:00",
    jamBuka: "12:00",
    defaultMenitPenyiapan: 15,
  });

  useEffect(() => {
    return dengarkanPengaturan(setJamOps);
  }, []);

  const slotJam = useMemo(() => generateSlotJam(jamOps), [jamOps]);

  useEffect(() => {
    function muatUlang() {
      setLines(bacaKeranjang());
    }
    muatUlang();
    return dengarkanKeranjang(muatUlang);
  }, []);

  useEffect(() => {
    if (!jamAmbil && slotJam.length > 0) setJamAmbil(slotJam[0].iso);
  }, [slotJam, jamAmbil]);

  const subtotal = lines.reduce((s, l) => s + hitungHargaLine(l), 0);

  async function konfirmasiPesanan() {
    if (lines.length === 0 || !jamAmbil) return;

    const nomorBersih = noHp.replace(/[^0-9]/g, "");
    if (nomorBersih.length < 9) {
      setError("Nomor WhatsApp wajib diisi dengan benar (minimal 9 digit).");
      return;
    }

    setError(null);
    setMengirim(true);
    try {
      const items: OrderItem[] = lines.map((l) => {
        const tambahanPerUnit = l.addOnDipilih.reduce(
          (s, g) => s + g.opsiTerpilih.reduce((s2, o) => s2 + o.hargaTambahan, 0),
          0
        );
        return {
          menuId: l.menuId,
          namaMenu: l.namaMenu,
          qty: l.qty,
          hargaSatuan: l.hargaSatuanDasar + tambahanPerUnit,
          addOnDipilih: l.addOnDipilih,
          catatan: l.catatan,
        };
      });

      const orderId = await buatPesanan({
        uid: user.uid,
        namaCustomer: user.displayName,
        noHpCustomer: noHp.trim(),
        items,
        totalHarga: subtotal,
        jamAmbil,
      });

      // Minta server hitung ulang harga (jangan percaya harga dari browser)
      // dan tetapkan kode unik transfer untuk pesanan ini.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, items }),
      });
      const data = await res.json();

      if (!res.ok || typeof data.kodeUnik !== "number") {
        const detail = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        setError(`Gagal menyiapkan pesanan: ${detail || "coba lagi."}`);
        setMengirim(false);
        return;
      }

      kosongkanKeranjang();
      setOrderBayar({
        id: orderId,
        kodeUnik: data.kodeUnik,
        totalTransfer: data.totalTransfer,
      });
    } catch (e) {
      setError("Gagal membuat pesanan. Coba lagi.");
      setMengirim(false);
    }
  }

  if (orderBayar) {
    return <HalamanBayarManual orderBayar={orderBayar} onSelesai={() => router.push("/pesanan")} />;
  }

  return (
    <main>
      <header className="app-header">
        <h1>Keranjang</h1>
      </header>

      <section className="kategori-section">
        {lines.length === 0 && (
          <p style={{ color: "var(--color-ink-soft)" }}>
            Keranjang masih kosong.
          </p>
        )}

        {lines.map((line) => (
          <div key={line.id} className="cart-line">
            <div className="cart-line-top">
              <span>
                {line.qty}× {line.namaMenu}
              </span>
              <span>{formatRupiah(hitungHargaLine(line))}</span>
            </div>

            {line.addOnDipilih.map((g) => (
              <div key={g.groupId} className="cart-line-addon">
                {g.groupJudul}: {g.opsiTerpilih.map((o) => o.nama).join(", ")}
              </div>
            ))}

            {line.catatan && (
              <div className="cart-line-catatan">Catatan: {line.catatan}</div>
            )}

            <div className="cart-line-footer">
              <div className="stepper">
                <button
                  onClick={() => updateQtyKeranjang(line.id, line.qty - 1)}
                  aria-label="Kurangi"
                >
                  −
                </button>
                <span className="qty">{line.qty}</span>
                <button
                  onClick={() => updateQtyKeranjang(line.id, line.qty + 1)}
                  aria-label="Tambah"
                >
                  +
                </button>
              </div>
              <button
                className="hapus-line-btn"
                onClick={() => hapusDariKeranjang(line.id)}
              >
                Hapus
              </button>
            </div>
          </div>
        ))}

        {lines.length > 0 && (
          <>
            <div className="modal-group-title" style={{ marginTop: 20 }}>
              Nomor WhatsApp
            </div>
            <input
              type="tel"
              className="jam-select"
              placeholder="Contoh: 081234567890"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
            />
            <p style={{ fontSize: 11.5, color: "var(--color-ink-soft)", marginTop: 4 }}>
              Dipakai outlet buat konfirmasi pesanan lewat WhatsApp.
            </p>

            <div className="modal-group-title" style={{ marginTop: 20 }}>
              Pembayaran
            </div>
            <p style={{ fontSize: 13, color: "var(--color-ink-soft)" }}>
              Transfer manual ke rekening BRI lewat QRIS. Setelah pesanan
              dibuat, kamu akan dapat kode unik & QRIS buat transfer, lalu
              upload bukti transfernya di sini.
            </p>

            <div className="cart-total-row">
              <span>Total Bayar</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>

            <div className="modal-group-title">Jam Ambil</div>
            <select
              className="jam-select"
              value={jamAmbil}
              onChange={(e) => setJamAmbil(e.target.value)}
            >
              {slotJam.map((s) => (
                <option key={s.iso} value={s.iso}>
                  {s.label}
                </option>
              ))}
            </select>

            {error && (
              <p style={{ color: "var(--color-accent)", fontSize: 13, marginTop: 8 }}>
                {error}
              </p>
            )}

            <button
              className="checkout-submit"
              disabled={mengirim}
              onClick={konfirmasiPesanan}
            >
              {mengirim ? "Memproses…" : `Konfirmasi Pesanan · ${formatRupiah(subtotal)}`}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function HalamanBayarManual({
  orderBayar,
  onSelesai,
}: {
  orderBayar: OrderBayar;
  onSelesai: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function kirimBukti() {
    if (!file) {
      setError("Pilih dulu foto/screenshot bukti transfernya.");
      return;
    }
    setError(null);
    setMengunggah(true);
    try {
      await simpanBuktiTransfer(orderBayar.id, file);
      setSukses(true);
    } catch (e) {
      setError("Gagal mengunggah bukti transfer. Coba lagi.");
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
            Nomor pesanan kamu: <strong>{orderBayar.id.slice(0, 8).toUpperCase()}</strong>
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
          Nomor pesanan: <strong>{orderBayar.id.slice(0, 8).toUpperCase()}</strong>
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
          <p style={{ fontSize: 12, color: "var(--color-ink-soft)", marginTop: 8 }}>
            Atau transfer manual ke rekening BRI
            <br />
            <strong>{REKENING_BRI.nomor}</strong> a.n. {REKENING_BRI.atasNama}
          </p>
        </div>

        <div
          style={{
            marginTop: 14,
            background: "var(--color-accent-soft)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
            Transfer PAS sejumlah (termasuk kode unik)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-accent)" }}>
            {formatRupiah(orderBayar.totalTransfer)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-ink-soft)", marginTop: 4 }}>
            Kode unik pesanan ini: <strong>{orderBayar.kodeUnik}</strong>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--color-ink-soft)", marginTop: 10 }}>
          Penting: transfer harus PAS sesuai nominal di atas (sampai 3 digit
          terakhir) supaya verifikasi lebih cepat.
        </p>

        <div className="modal-group-title" style={{ marginTop: 20 }}>
          Upload Bukti Transfer
        </div>
        <label
          style={{
            display: "block",
            border: "1.5px dashed var(--color-line)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            textAlign: "center",
            fontSize: 13.5,
            color: "var(--color-ink-soft)",
            cursor: "pointer",
          }}
        >
          {file ? file.name : "Ketuk untuk pilih foto/screenshot bukti transfer"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
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
      </section>
    </main>
  );
}
