// Definisi bentuk data yang dipakai di seluruh aplikasi.
// Mengikuti struktur Firestore yang sudah kita rancang bersama.

export type AddOnOption = {
  id: string;
  nama: string; // contoh: "Nasi", "Es Teh Manis"
  hargaTambahan: number; // 0 kalau gratis
  tersedia?: boolean; // default true kalau belum diset
};

export type AddOnGroup = {
  id: string;
  judul: string; // contoh: "Pilih Minuman", "Tingkat Pedas"
  wajibDipilih: boolean; // true kalau customer harus pilih salah satu
  pilihanMaksimal: number; // 1 = pilih salah satu, >1 = boleh pilih beberapa
  opsi: AddOnOption[];
};

export type MenuItem = {
  id: string;
  nama: string;
  deskripsi?: string;
  harga: number;
  kategori: string; // contoh: "Makanan Utama", "Minuman", "Camilan"
  tersedia: boolean;
  addOnGroups: AddOnGroup[];
};

export type OrderItemAddOnPilihan = {
  groupId: string;
  groupJudul: string;
  opsiTerpilih: { id: string; nama: string; hargaTambahan: number }[];
};

export type OrderItem = {
  menuId: string;
  namaMenu: string;
  qty: number;
  hargaSatuan: number;
  addOnDipilih: OrderItemAddOnPilihan[];
  catatan?: string; // request bebas dari customer per item
};

export type OrderStatus =
  | "menunggu_pembayaran"
  | "menunggu_verifikasi"
  | "dibayar"
  | "sedang_disiapkan"
  | "siap_diambil"
  | "selesai"
  | "dibatalkan";

export type Order = {
  id: string;
  uid: string;
  namaCustomer: string | null;
  noHpCustomer?: string;
  items: OrderItem[];
  totalHarga: number;
  // Kode unik (100-499) ditambahkan ke totalHarga supaya nominal transfer tiap
  // pesanan beda-beda dan gampang dicocokkan manual di mutasi rekening.
  // Angka yang sama ini juga jadi 3 digit belakang nomor pesanan "GSJ-XXX"
  // (lihat kodePesanan() di lib/orderLabels.ts).
  kodeUnik?: number;
  // totalHarga + kodeUnik -- ini nominal PAS yang wajib ditransfer customer.
  totalTransfer?: number;
  // Foto bukti transfer, disimpan sebagai base64 data URI langsung di
  // Firestore (bukan link ke Firebase Storage) -- supaya tidak perlu upgrade
  // ke paket Blaze. Ukurannya sudah dikompres kecil di sisi customer.
  buktiTransferUrl?: string;
  buktiTransferUploadedAt?: string;
  jamAmbil: string | null; // ISO datetime -- null sampai admin verifikasi pembayaran
  status: OrderStatus;
  metodePembayaran?: "transfer_manual";
  createdAt: string; // ISO datetime
};

export type OperationalHours = {
  jamMulaiPesan: string; // format "HH:mm" -- juga jadi jam BUKA aplikasi kalau modeAplikasi "otomatis"
  jamTutupPesan?: string; // format "HH:mm" -- jam TUTUP aplikasi, dipakai kalau modeAplikasi "otomatis"
  jamBuka: string; // format "HH:mm" -- jam BUKA outlet (pesanan mulai bisa diambil), SELALU otomatis
  jamTutupOutlet?: string; // format "HH:mm" -- jam TUTUP outlet (batas akhir pesanan bisa diambil), SELALU otomatis
  defaultMenitPenyiapan: number; // default 30
  // Cara menentukan aplikasi (penerimaan pesanan) buka/tutup:
  // "manual" (default) -- admin nyalain/matiin sendiri lewat saklar tokoBuka.
  // "otomatis" -- ngikutin jadwal jamMulaiPesan - jamTutupPesan tiap hari.
  modeAplikasi?: "manual" | "otomatis";
  tokoBuka?: boolean; // dipakai HANYA kalau modeAplikasi "manual"; default true kalau belum diset
};
