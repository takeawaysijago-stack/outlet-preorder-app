// Tarif resmi Midtrans (per dokumentasi mereka):
// - QRIS: 0,7% dari total transaksi (sudah termasuk PPN)
// - Virtual Account: flat Rp4.000 + PPN 11% (dibulatkan ke atas)

export type MetodeBayar = "qris" | "va";

export function hitungBiayaAdmin(metode: MetodeBayar, subtotal: number): number {
  if (metode === "qris") {
    return Math.ceil(subtotal * 0.007);
  }
  return Math.ceil(4000 * 1.11); // flat Rp4.000 + PPN 11%
}

export function labelMetode(metode: MetodeBayar): string {
  return metode === "qris" ? "QRIS" : "Transfer Bank (Virtual Account)";
}
