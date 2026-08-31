// Ubah nomor HP customer (0812..., +62812..., 62812...) jadi format
// internasional tanpa simbol, yang dibutuhkan link wa.me

export function normalisasiNomorWA(nomor: string): string {
  let n = nomor.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n;
}

export function buatLinkWA(nomor: string, pesan: string): string {
  return `https://wa.me/${normalisasiNomorWA(nomor)}?text=${encodeURIComponent(pesan)}`;
}
