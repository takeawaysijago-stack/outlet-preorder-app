import type { OperationalHours } from "@/lib/types";

// Ubah "HH:mm" jadi jumlah menit sejak tengah malam. Contoh: "13:30" -> 810.
export function waktuKeMenit(jam: string): number {
  const [h, m] = jam.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Cek apakah "sekarangMenit" ada di dalam rentang [mulaiMenit, selesaiMenit).
// Mendukung rentang yang lewat tengah malam (misal buka 20:00, tutup 02:00).
// Kalau mulai == selesai, dianggap buka 24 jam (gak ada batasan).
export function dalamRentangWaktu(
  sekarangMenit: number,
  mulaiMenit: number,
  selesaiMenit: number
): boolean {
  if (mulaiMenit === selesaiMenit) return true;
  if (mulaiMenit < selesaiMenit) {
    return sekarangMenit >= mulaiMenit && sekarangMenit < selesaiMenit;
  }
  // Rentang lewat tengah malam
  return sekarangMenit >= mulaiMenit || sekarangMenit < selesaiMenit;
}

// Apakah APLIKASI (penerimaan pesanan) sedang buka?
// - Mode "manual": ikut saklar tokoBuka yang diatur admin sendiri.
// - Mode "otomatis": dihitung dari jadwal jamMulaiPesan - jamTutupPesan.
export function apakahAplikasiBuka(
  settings: OperationalHours,
  sekarang: Date = new Date()
): boolean {
  if (settings.modeAplikasi === "otomatis") {
    const menitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes();
    return dalamRentangWaktu(
      menitSekarang,
      waktuKeMenit(settings.jamMulaiPesan),
      waktuKeMenit(settings.jamTutupPesan ?? "23:59")
    );
  }
  return settings.tokoBuka !== false;
}

// Hitung jam ambil otomatis saat admin verifikasi & mulai proses pesanan:
// sekarang + defaultMenitPenyiapan, TAPI gak boleh jatuh di luar jam
// operasional OUTLET (jamBuka - jamTutupOutlet, selalu otomatis, gak ada
// mode manual). Kalau hasil hitungan sebelum outlet buka -> dimajukan ke jam
// buka outlet hari itu. Kalau sesudah outlet tutup -> dimajukan ke jam buka
// outlet BESOK.
export function hitungJamAmbilOtomatis(
  settings: OperationalHours,
  sekarang: Date = new Date()
): Date {
  const target = new Date(sekarang.getTime() + settings.defaultMenitPenyiapan * 60 * 1000);

  const mulaiMenit = waktuKeMenit(settings.jamBuka);
  const selesaiMenit = waktuKeMenit(settings.jamTutupOutlet ?? "23:59");
  const targetMenit = target.getHours() * 60 + target.getMinutes();

  function padaJam(basis: Date, menit: number): Date {
    const d = new Date(basis);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(menit);
    return d;
  }

  if (mulaiMenit === selesaiMenit) {
    // Outlet buka 24 jam -- gak perlu disesuaikan
    return target;
  }

  if (mulaiMenit < selesaiMenit) {
    // Jam operasional normal, gak lewat tengah malam
    if (targetMenit < mulaiMenit) return padaJam(target, mulaiMenit);
    if (targetMenit >= selesaiMenit) {
      const besok = new Date(target);
      besok.setDate(besok.getDate() + 1);
      return padaJam(besok, mulaiMenit);
    }
    return target;
  }

  // Jam operasional lewat tengah malam (misal buka 20:00, tutup 02:00) --
  // outlet dianggap TUTUP hanya di antara jam tutup dan jam buka (siang hari).
  const sedangTutup = targetMenit >= selesaiMenit && targetMenit < mulaiMenit;
  if (sedangTutup) return padaJam(target, mulaiMenit);
  return target;
}
