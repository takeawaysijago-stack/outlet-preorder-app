import { redirect } from "next/navigation";

// Halaman "Pesanan Masuk" sekarang jadi halaman utama admin di /admin.
// Redirect ini biar link lama (/admin/pesanan) tetap jalan.
export default function RedirectPesanan() {
  redirect("/admin");
}
