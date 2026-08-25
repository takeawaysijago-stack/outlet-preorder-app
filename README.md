# Pesan & Ambil — Aplikasi Pre-order Outlet

Tahap 1 dari pembangunan aplikasi: kerangka dasar project.

## Isi tahap ini
- Struktur project Next.js (App Router)
- Halaman menu customer (`app/page.tsx`) — masih pakai data contoh
- Halaman admin (`app/admin/page.tsx`) — masih placeholder
- Konfigurasi koneksi Firebase (`lib/firebase.ts`) — belum aktif, menunggu
  project Firebase dibuat dan env variable diisi
- Struktur data (`lib/types.ts`) sesuai rancangan menu, add-on, pesanan,
  dan jam operasional yang sudah didiskusikan
- File PWA dasar (`public/manifest.json`)
- Konfigurasi Firebase App Hosting (`apphosting.yaml`)

## Belum ada di tahap ini (menyusul)
- Koneksi nyata ke Firestore (menu masih data contoh/hardcode)
- Kelola menu & add-on dari dashboard admin
- Login admin (Firebase Authentication)
- Halaman keranjang, pilih jam ambil, checkout
- Integrasi pembayaran Midtrans (QRIS & Virtual Account)
- Pengaturan jam operasional dari dashboard admin

## Langkah selanjutnya
1. Upload folder ini ke repository GitHub kamu
2. Buat project baru di Firebase Console
3. Hubungkan repo GitHub ke Firebase App Hosting
