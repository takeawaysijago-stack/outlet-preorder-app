"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginGate from "@/components/LoginGate";
import WhatsAppGate from "@/components/WhatsAppGate";
import {
  bacaKeranjang,
  dengarkanKeranjang,
  hapusDariKeranjang,
  hitungHargaLine,
  kosongkanKeranjang,
  updateQtyKeranjang,
  type CartLine,
} from "@/lib/cart";
import { buatPesanan } from "@/lib/orderService";
import type { OrderItem } from "@/lib/types";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

export default function HalamanKeranjang() {
  return (
    <LoginGate>
      {(user) => (
        <WhatsAppGate user={user}>
          {(noHp) => <IsiKeranjang user={user} noHp={noHp} />}
        </WhatsAppGate>
      )}
    </LoginGate>
  );
}

function IsiKeranjang({
  user,
  noHp,
}: {
  user: { uid: string; displayName: string | null };
  noHp: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function muatUlang() {
      setLines(bacaKeranjang());
    }
    muatUlang();
    return dengarkanKeranjang(muatUlang);
  }, []);

  const subtotal = lines.reduce((s, l) => s + hitungHargaLine(l), 0);

  async function konfirmasiPesanan() {
    if (lines.length === 0) return;

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
        noHpCustomer: noHp,
        items,
        totalHarga: subtotal,
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
      router.push(`/pesanan/${orderId}`);
    } catch (e) {
      setError("Gagal membuat pesanan. Coba lagi.");
      setMengirim(false);
    }
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
              Pembayaran
            </div>
            <p style={{ fontSize: 13, color: "var(--color-ink-soft)" }}>
              Bayar pakai QRIS. Setelah pesanan dikonfirmasi, kamu akan dapat
              kode unik & QRIS buat transfer, lalu upload bukti transfernya
              di sini.
            </p>

            <div className="cart-total-row">
              <span>Total Bayar</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--color-ink-soft)", marginTop: -8 }}>
              *Nanti ditambah kode unik 3 digit di layar berikutnya, supaya
              verifikasi transfer lebih cepat. Jam ambil akan ditentukan
              otomatis begitu pembayaran diverifikasi.
            </p>

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
