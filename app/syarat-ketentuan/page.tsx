import Link from "next/link";

export const metadata = {
  title: "Syarat & Ketentuan | Geprek Si Jago",
};

export default function HalamanSyaratKetentuan() {
  return (
    <main>
      <header className="app-header">
        <div className="eyebrow">Geprek Si Jago</div>
        <h1>Syarat & Ketentuan</h1>
        <p className="subtitle">Berlaku mulai 13 September 2026</p>
      </header>

      <section className="kategori-section" style={{ fontSize: 14, lineHeight: 1.6 }}>
        <p>
          Dengan memesan lewat aplikasi ini, kamu dianggap sudah membaca dan
          setuju dengan syarat & ketentuan di bawah.
        </p>

        <h3 style={{ marginTop: 20 }}>1. Pemesanan & Pengambilan</h3>
        <ul style={{ paddingLeft: 18 }}>
          <li>Layanan ini adalah preorder untuk diambil sendiri di outlet — bukan layanan antar/delivery.</li>
          <li>Pesanan disiapkan mendekati jam ambil yang kamu pilih saat checkout.</li>
          <li>Pesanan bisa diambil begitu status pesanan menunjukkan "Siap Diambil", dan/atau setelah jam pengambilan yang dipilih sudah terlewat.</li>
          <li>Menu, foto, dan harga bisa berbeda sedikit dari kondisi asli, dan bisa berubah atau habis sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
        </ul>

        <h3 style={{ marginTop: 20 }}>2. Pembayaran</h3>
        <ul style={{ paddingLeft: 18 }}>
          <li>Pembayaran dilakukan manual lewat QRIS/transfer, dengan nominal PAS termasuk kode unik yang ditampilkan saat checkout.</li>
          <li>Transfer dengan nominal yang tidak sesuai kode unik bisa memperlambat proses verifikasi atau ditolak.</li>
          <li>Verifikasi dilakukan manual oleh outlet, biasanya dalam waktu operasional toko.</li>
          <li>Kalau kamu salah transfer (nominal atau tujuan salah), langsung hubungi admin lewat tombol WhatsApp yang ada di kartu pesanan — pesannya sudah otomatis berisi nama & nomor pesananmu.</li>
          <li>Bukti transfer yang diunggah akan dicek kecocokannya dengan nominal & waktu transfer sebelum pesanan diproses.</li>
        </ul>

        <h3 style={{ marginTop: 20 }}>3. Pembatalan & Refund</h3>
        <ul style={{ paddingLeft: 18 }}>
          <li>Semua permintaan pembatalan pesanan & refund dilakukan lewat menghubungi admin langsung via tombol WhatsApp di kartu pesanan.</li>
          <li>Refund (kalau disetujui) dilakukan manual lewat transfer balik ke rekening customer, waktunya menyesuaikan proses dari admin.</li>
        </ul>

        <h3 style={{ marginTop: 20 }}>4. Data Pribadi</h3>
        <ul style={{ paddingLeft: 18 }}>
          <li>Data yang kami simpan: nama & foto profil dari akun Google, nomor WhatsApp, riwayat pesanan, dan foto bukti transfer.</li>
          <li>Data ini digunakan untuk membantu admin menghubungi customer kalau ada kendala terkait pesanan, serta memproses & memverifikasi pesananmu.</li>
          <li>Kami tidak menjual atau membagikan data pribadimu ke pihak ketiga di luar keperluan operasional outlet ini.</li>
        </ul>

        <h3 style={{ marginTop: 20 }}>5. Lain-lain</h3>
        <ul style={{ paddingLeft: 18 }}>
          <li>Outlet berhak menolak atau membatalkan pesanan yang dicurigai mencurigakan/menyalahi ketentuan ini.</li>
          <li>Syarat & ketentuan ini bisa diperbarui sewaktu-waktu; versi terbaru akan selalu tersedia di halaman ini.</li>
          <li>Kalau terjadi kendala apa pun seputar pesanan, silakan hubungi admin lewat tombol WhatsApp yang ada di kartu pesanan.</li>
        </ul>

        <Link
          href="/"
          className="checkout-submit"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 24 }}
        >
          ← Kembali ke Menu
        </Link>
      </section>
    </main>
  );
}
