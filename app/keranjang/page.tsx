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
import type { OrderItem } from "@/lib/types";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// Sementara: slot jam ambil digenerate manual tiap 30 menit untuk 4 jam ke depan.
// Nanti diganti mengikuti jam operasional yang diatur admin.
function generateSlotJam(): { label: string; iso: string }[] {
  const slots: { label: string; iso: string }[] = [];
  const sekarang = new Date();
  let mulai = new Date(sekarang.getTime() + 30 * 60 * 1000);
  mulai.setMinutes(Math.ceil(mulai.getMinutes() / 15) * 15, 0, 0);

  for (let i = 0; i < 10; i++) {
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
  const [mengirim, setMengirim] = useState(false);
  const [sukses, setSukses] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slotJam = useMemo(() => generateSlotJam(), []);

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

  const total = lines.reduce((s, l) => s + hitungHargaLine(l), 0);

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
          addOnDipilih: l.addOnDipilih.map((g) => ({
            groupId: g.groupId,
            optionIds: g.opsiTerpilih.map((o) => o.id),
          })),
          catatan: l.catatan,
        };
      });

      const orderId = await buatPesanan({
        uid: user.uid,
        namaCustomer: user.displayName,
        items,
        totalHarga: total,
        jamAmbil,
      });

      // Minta token pembayaran ke server (server yang hubungi Midtrans)
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          items,
          total,
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
          setSukses(orderId);
        },
        onPending: async () => {
          // Untuk VA: pembayaran belum masuk, customer masih perlu transfer.
          kosongkanKeranjang();
          setSukses(orderId);
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
            <div className="cart-total-row">
              <span>Total</span>
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
