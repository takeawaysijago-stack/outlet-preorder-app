// Selisih hari kalender antara tanggal ISO dan sekarang (0 = hari ini,
// 1 = kemarin, dst). Dipakai juga buat nentuin pesanan mana yang "lama"
// (misal buat efek buram atau fitur hapus pesanan lama di admin).
export function selisihHari(iso: string): number {
  const tanggalPesan = new Date(iso);
  const sekarang = new Date();

  const hariPesan = new Date(
    tanggalPesan.getFullYear(),
    tanggalPesan.getMonth(),
    tanggalPesan.getDate()
  );
  const hariIni = new Date(
    sekarang.getFullYear(),
    sekarang.getMonth(),
    sekarang.getDate()
  );

  return Math.round((hariIni.getTime() - hariPesan.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatTanggalRelatif(iso: string): string {
  const tanggalPesan = new Date(iso);
  const selisih = selisihHari(iso);

  if (selisih === 0) return "Hari ini";
  if (selisih === 1) return "Kemarin";
  if (selisih >= 2 && selisih <= 6) return `${selisih} hari lalu`;

  return tanggalPesan.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: tanggalPesan.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}
