import type { OrderStatus } from "@/lib/types";

export const LABEL_STATUS: Record<OrderStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  dibayar: "Sudah Dibayar",
  sedang_disiapkan: "Sedang Disiapkan",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

// Urutan status berikutnya kalau admin klik "Proses Selanjutnya"
export const STATUS_BERIKUTNYA: Partial<Record<OrderStatus, OrderStatus>> = {
  dibayar: "sedang_disiapkan",
  sedang_disiapkan: "siap_diambil",
  siap_diambil: "selesai",
};
