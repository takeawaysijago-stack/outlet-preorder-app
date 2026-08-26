// Keranjang disimpan di localStorage browser (bukan di Firestore),
// supaya cepat & tidak perlu koneksi database tiap tambah/ubah item.
// Baru masuk Firestore setelah customer benar-benar checkout jadi pesanan.

export type CartAddOnPilihan = {
  groupId: string;
  groupJudul: string;
  opsiTerpilih: { id: string; nama: string; hargaTambahan: number }[];
};

export type CartLine = {
  id: string;
  menuId: string;
  namaMenu: string;
  hargaSatuanDasar: number;
  addOnDipilih: CartAddOnPilihan[];
  catatan?: string;
  qty: number;
};

const KEY = "geprek_cart_v1";
const EVENT = "cart-updated";

export function bacaKeranjang(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function simpanKeranjang(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVENT));
}

export function dengarkanKeranjang(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function tambahKeKeranjang(line: Omit<CartLine, "id">) {
  const lines = bacaKeranjang();
  lines.push({ ...line, id: crypto.randomUUID() });
  simpanKeranjang(lines);
}

export function hapusDariKeranjang(id: string) {
  simpanKeranjang(bacaKeranjang().filter((l) => l.id !== id));
}

export function updateQtyKeranjang(id: string, qty: number) {
  const lines = bacaKeranjang()
    .map((l) => (l.id === id ? { ...l, qty } : l))
    .filter((l) => l.qty > 0);
  simpanKeranjang(lines);
}

export function kosongkanKeranjang() {
  simpanKeranjang([]);
}

export function hitungHargaLine(line: CartLine): number {
  const tambahan = line.addOnDipilih.reduce(
    (sum, g) =>
      sum + g.opsiTerpilih.reduce((s, o) => s + o.hargaTambahan, 0),
    0
  );
  return (line.hargaSatuanDasar + tambahan) * line.qty;
}
