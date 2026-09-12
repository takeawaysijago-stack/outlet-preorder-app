import type { Order, OrderStatus } from "@/lib/types";

// Nomor pesanan yang ditampilkan ke user
export function kodePesanan(order: Pick<Order, "id">): string {
  return `#${order.id.slice(0, 8).toUpperCase()}`;
}

export const LABEL_STATUS: Record<OrderStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_verifikasi: "Perlu Verifikasi",
  dibayar: "Sudah Dibayar",
  sedang_disiapkan: "Sedang Disiapkan",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

// Urutan status berikutnya kalau admin klik "Proses Selanjutnya"
export const STATUS_BERIKUTNYA: Partial<Record<OrderStatus, OrderStatus>> = {
  menunggu_verifikasi: "dibayar",
  dibayar: "sedang_disiapkan",
  sedang_disiapkan: "siap_diambil",
  siap_diambil: "selesai",
};
