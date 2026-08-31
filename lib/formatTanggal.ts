export function formatTanggalRelatif(iso: string): string {
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

  const selisihHari = Math.round(
    (hariIni.getTime() - hariPesan.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (selisihHari === 0) return "Hari ini";
  if (selisihHari === 1) return "Kemarin";
  if (selisihHari >= 2 && selisihHari <= 6) return `${selisihHari} hari lalu`;

  return tanggalPesan.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: tanggalPesan.getFullYear() !== sekarang.getFullYear() ? "numeric" : undefined,
  });
}
