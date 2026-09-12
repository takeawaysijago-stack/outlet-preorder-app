// Ganti nilai di bawah sesuai rekening BRI & gambar QRIS statis outlet kamu.
//
// Untuk gambar QRIS: simpan file QRIS statis (screenshot/export dari BRI
// mobile) sebagai "qris-bri.png" di folder /public, supaya bisa diakses lewat
// path "/qris-bri.png" di bawah ini. Kalau nama filenya beda, sesuaikan juga
// QRIS_IMAGE_PATH-nya.

export const REKENING_BRI = {
  nomor: "000000000000", // TODO: ganti nomor rekening BRI asli
  atasNama: "GEPREK SI JAGO", // TODO: ganti sesuai nama pemilik rekening
};

export const QRIS_IMAGE_PATH = "/qris-bri.png";
