import { collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderItem } from "@/lib/types";

export async function buatPesanan(data: {
  uid: string;
  namaCustomer: string | null;
  noHpCustomer: string;
  items: OrderItem[];
  totalHarga: number;
  jamAmbil: string;
}) {
  const ref = await addDoc(collection(db, "orders"), {
    uid: data.uid,
    namaCustomer: data.namaCustomer,
    noHpCustomer: data.noHpCustomer,
    items: data.items,
    totalHarga: data.totalHarga,
    jamAmbil: data.jamAmbil,
    status: "menunggu_pembayaran",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateStatusPesanan(orderId: string, status: string) {
  await updateDoc(doc(db, "orders", orderId), { status });
}

// Dipanggil setelah customer pilih foto bukti transfer (sudah dikompres jadi
// base64 di browser lewat lib/gambar.ts). Disimpan langsung di dokumen
// Firestore -- gak pakai Firebase Storage sama sekali. Pesanan pindah ke
// status "menunggu_verifikasi" supaya muncul di tab khusus admin.
export async function simpanBuktiTransfer(orderId: string, buktiBase64: string) {
  await updateDoc(doc(db, "orders", orderId), {
    buktiTransferUrl: buktiBase64,
    buktiTransferUploadedAt: new Date().toISOString(),
    status: "menunggu_verifikasi",
  });
}

// Admin klik "Verifikasi & Terima" -- nominal & bukti sudah dicek manual, cocok.
export async function verifikasiPembayaran(orderId: string) {
  await updateStatusPesanan(orderId, "dibayar");
}

// Admin klik "Tolak Bukti" -- misal fotonya buram atau nominal gak cocok.
// Pesanan dikembalikan ke "menunggu_pembayaran" supaya customer bisa upload ulang.
export async function tolakBuktiTransfer(orderId: string) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "menunggu_pembayaran",
    buktiTransferUrl: null,
    buktiTransferUploadedAt: null,
  });
}

export function dengarkanSemuaPesanan(callback: (orders: Order[]) => void) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
    callback(orders);
  });
}

export function dengarkanPesananSaya(uid: string, callback: (orders: Order[]) => void) {
  const q = query(collection(db, "orders"), where("uid", "==", uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, "id">),
      }));
      orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      callback(orders);
    },
    () => callback([])
  );
}
