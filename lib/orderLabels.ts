import type { Order, OrderStatus } from "@/lib/types";

// Nomor pesanan yang ditampilkan ke user.
// Formatnya GSJ-XXX, di mana XXX adalah kode unik (100-499) yang sama persis
// dengan kode unik nominal transfer pesanan ini -- jadi customer/admin tinggal
// cocokkan 3 digit belakang nomor pesanan dengan 3 digit belakang nominal
// transfer di mutasi rekening.
// Fallback ke format lama (potongan ID Firestore) cuma buat jaga-jaga kalau
// ada pesanan lama/aneh yang entah kenapa belum punya kodeUnik sama sekali.
export function kodePesanan(order: Pick<Order, "id" | "kodeUnik">): string {
  if (typeof order.kodeUnik === "number") {
    return `GSJ-${order.kodeUnik}`;
  }
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
