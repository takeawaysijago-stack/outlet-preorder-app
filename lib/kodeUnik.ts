import type { Firestore } from "firebase-admin/firestore";

const MIN = 100;
const MAX = 999;

// Cari kode unik (100-999) yang belum dipakai pesanan lain yang masih aktif
// menunggu pembayaran/verifikasi, supaya nominal transfer tiap pesanan beda-beda
// dan gampang dicocokkan manual di mutasi rekening BRI.
export async function buatKodeUnik(db: Firestore, kecualiOrderId: string): Promise<number> {
  const snap = await db
    .collection("orders")
    .where("status", "in", ["menunggu_pembayaran", "menunggu_verifikasi"])
    .get();

  const kodeDipakai = new Set(
    snap.docs
      .filter((d) => d.id !== kecualiOrderId)
      .map((d) => d.data().kodeUnik)
      .filter((k): k is number => typeof k === "number")
  );

  for (let percobaan = 0; percobaan < 50; percobaan++) {
    const kandidat = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    if (!kodeDipakai.has(kandidat)) return kandidat;
  }
  // Kalau 50x percobaan gagal (nyaris mustahil kecuali toko lagi super ramai),
  // pakai saja angka acak walau mungkin dobel dengan pesanan lain.
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}
