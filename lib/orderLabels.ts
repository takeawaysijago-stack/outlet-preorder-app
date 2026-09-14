import type { Order, OrderStatus } from "@/lib/types";

// Nomor pesanan yang ditampilkan ke user
export function kodePesanan(order: Pick<Order, "id">): string {
  return `#${order.id.slice(0, 8).toUpperCase()}`;
}

export const LABEL_STATUS: Record<OrderStatus, string> = {
  menunggu_pembayaran: "Belum Bayar",
  menunggu_verifikasi: "Sedang Verifikasi Pembayaran",
  dibayar: "Sudah Dibayar",
  sedang_disiapkan: "Sedang Disiapkan",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

// Urutan status berikutnya kalau admin klik "Proses Selanjutnya"
export const STATUS_BERIKUTNYA: Partial<Record<OrderStatus, OrderStatus>> = {
  menunggu_pembayaran: "sedang_disiapkan",
  menunggu_verifikasi: "sedang_disiapkan",
  dibayar: "sedang_disiapkan", // jaga-jaga buat pesanan lama yang masih nyangkut di status ini
  sedang_disiapkan: "siap_diambil",
  siap_diambil: "selesai",
};
