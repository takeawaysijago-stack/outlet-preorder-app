// Nomor WhatsApp admin outlet, dalam format internasional TANPA "+" atau "0"
// di depan. Contoh: nomor 0812-3456-7890 ditulis "6281234567890".
export const ADMIN_WA_NOMOR = "6282196338880";

import { kodePesanan, LABEL_STATUS } from "@/lib/orderLabels";
import type { Order } from "@/lib/types";

// Bikin link WhatsApp ke admin, pesannya sudah otomatis terisi nama customer
// & nomor pesanan -- customer tinggal klik & kirim, gak perlu ngetik ulang.
export function buatLinkWaAdmin(order: Pick<Order, "id" | "namaCustomer" | "status">): string {
  const pesan =
    `Halo min, saya ${order.namaCustomer ?? "customer"}, mau tanya soal pesanan ` +
    `${kodePesanan(order)} (status: ${LABEL_STATUS[order.status]}).`;
  return `https://wa.me/${ADMIN_WA_NOMOR}?text=${encodeURIComponent(pesan)}`;
}
