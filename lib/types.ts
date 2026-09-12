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
  // Kode unik (100-999) ditambahkan ke totalHarga supaya nominal transfer tiap
  // pesanan beda-beda dan gampang dicocokkan manual di mutasi rekening.
  kodeUnik?: number;
  // totalHarga + kodeUnik -- ini nominal PAS yang wajib ditransfer customer.
  totalTransfer?: number;
  buktiTransferUrl?: string;
  buktiTransferUploadedAt?: string;
  jamAmbil: string; // ISO datetime
  status: OrderStatus;
  metodePembayaran?: "transfer_manual";
  createdAt: string; // ISO datetime
};

export type OperationalHours = {
  jamMulaiPesan: string; // format "HH:mm", contoh "09:00"
  jamBuka: string; // format "HH:mm", contoh "12:00"
  defaultMenitPenyiapan: number; // default 30
  tokoBuka?: boolean; // default true kalau belum diset
};
