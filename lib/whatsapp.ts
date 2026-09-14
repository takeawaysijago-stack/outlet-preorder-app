// Ubah nomor HP customer (0812..., +62812..., 62812...) jadi format
// internasional tanpa simbol, yang dibutuhkan link wa.me

import { kodePesanan } from "@/lib/orderLabels";
import type { Order } from "@/lib/types";

export function normalisasiNomorWA(nomor: string): string {
  let n = nomor.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n;
}

export function buatLinkWA(nomor: string, pesan: string): string {
  return `https://wa.me/${normalisasiNomorWA(nomor)}?text=${encodeURIComponent(pesan)}`;
}

// Pesan WA admin ke customer, beda-beda tergantung status pesanan saat ini --
// biar admin gak perlu ngetik ulang tiap mau chat.
export function buatPesanStatusWA(order: Pick<Order, "id" | "namaCustomer" | "status">): string {
  const nama = order.namaCustomer ?? "customer";
  const nomor = kodePesanan(order);
  const awalan = `Halo ${nama}, ini pesanan ${nomor}.`;

  switch (order.status) {
    case "menunggu_pembayaran":
      return `${awalan} Silakan upload bukti pembayaran untuk verifikasi pesanan Anda.`;
    case "menunggu_verifikasi":
      // Sengaja singkat -- admin biasanya mau nulis sendiri soal buktinya
      return awalan;
    case "dibayar":
    case "sedang_disiapkan":
      return `${awalan} Makanan Anda sedang disiapkan.`;
    case "siap_diambil":
      return `${awalan} Pesanan Anda sudah siap diambil.`;
    default:
      return awalan;
  }
}
