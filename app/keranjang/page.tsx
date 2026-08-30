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
import { buatPesanan, updateStatusPesanan } from "@/lib/orderService";
import { loadSnapScript } from "@/lib/loadSnap";
import { hitungBiayaAdmin, labelMetode, type MetodeBayar } from "@/lib/biayaAdmin";
import { dengarkanPengaturan } from "@/lib/settingsService";
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

export default function HalamanKeranjang() {
  return <LoginGate>{(user) => <IsiKeranjang user={user} />}</LoginGate>;
}

function IsiKeranjang({ user }: { user: { uid: string; displayName: string | null } }) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [jamAmbil, setJamAmbil] = useState("");
  const [metode, setMetode] = useState<MetodeBayar>("qris");
  const [mengirim, setMengirim] = useState(false);
  const [sukses, setSukses] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const biayaAdmin = hitungBiayaAdmin(metode, subtotal);
  const total = subtotal + biayaAdmin;

  async function konfirmasiPesanan() {
    if (lines.length === 0 || !jamAmbil) return;
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
        items,
        totalHarga: total,
        jamAmbil,
        metodePembayaran: metode === "qris" ? "qris" : "virtual_account",
        biayaAdmin,
      });

      // Minta token pembayaran ke server (server yang hubungi Midtrans)
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          items,
          total: subtotal,
          biayaAdmin,
          metode,
          namaCustomer: user.displayName,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.token) {
        setError("Gagal menyiapkan pembayaran. Pesanan tetap tersimpan, coba lagi.");
        setMengirim(false);
        return;
      }

      await loadSnapScript();

      window.snap?.pay(data.token, {
        onSuccess: async () => {
          await updateStatusPesanan(orderId, "dibayar");
          kosongkanKeranjang();
          router.push("/pesanan");
        },
        onPending: async () => {
          // Untuk VA: pembayaran belum masuk, customer masih perlu transfer.
          kosongkanKeranjang();
          router.push("/pesanan");
        },
        onError: () => {
          setError("Pembayaran gagal. Silakan coba lagi.");
          setMengirim(false);
        },
        onClose: () => {
          setError(
            "Pop-up ditutup sebelum pembayaran selesai. Pesanan tetap tersimpan, buka kembali dari riwayat untuk lanjut bayar."
          );
          setMengirim(false);
        },
      });
    } catch (e) {
      setError("Gagal membuat pesanan. Coba lagi.");
      setMengirim(false);
    }
  }

  if (sukses) {
    return (
      <main>
        <header className="app-header">
          <h1>Pesanan Diterima 🎉</h1>
          <p className="subtitle">
            Nomor pesanan kamu: <strong>{sukses.slice(0, 8).toUpperCase()}</strong>
          </p>
        </header>
        <section className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)", fontSize: 13.5 }}>
            Kalau kamu bayar pakai Virtual Account, selesaikan transfer sesuai
            nomor VA yang muncul di pop-up tadi. Kalau QRIS, pesanan langsung
            diproses begitu pembayaran terkonfirmasi.
          </p>
          <button
            className="checkout-submit"
            onClick={() => router.push("/")}
            style={{ marginTop: 16 }}
          >
            Kembali ke Menu
          </button>
        </section>
      </main>
    );
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
              Metode Pembayaran
            </div>
            {(["qris", "va"] as MetodeBayar[]).map((m) => (
              <label
                key={m}
                className={`modal-opsi ${metode === m ? "dipilih" : ""}`}
              >
                <span>
                  {labelMetode(m)}
                  <br />
                  <small style={{ color: "var(--color-ink-soft)", fontWeight: 400 }}>
                    Biaya admin: {formatRupiah(hitungBiayaAdmin(m, subtotal))}
                  </small>
                </span>
                <input
                  type="radio"
                  checked={metode === m}
                  onChange={() => setMetode(m)}
                />
              </label>
            ))}

            <div style={{ marginTop: 14, fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--color-ink-soft)" }}>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-ink-soft)" }}>Biaya admin</span>
                <span>{formatRupiah(biayaAdmin)}</span>
              </div>
            </div>

            <div className="cart-total-row">
              <span>Total Bayar</span>
              <span>{formatRupiah(total)}</span>
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
              {mengirim ? "Memproses…" : `Konfirmasi Pesanan · ${formatRupiah(total)}`}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
