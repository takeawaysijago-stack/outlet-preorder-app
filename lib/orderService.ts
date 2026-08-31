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
  metodePembayaran: "qris" | "virtual_account";
  biayaAdmin: number;
}) {
  const ref = await addDoc(collection(db, "orders"), {
    uid: data.uid,
    namaCustomer: data.namaCustomer,
    noHpCustomer: data.noHpCustomer,
    items: data.items,
    totalHarga: data.totalHarga,
    jamAmbil: data.jamAmbil,
    metodePembayaran: data.metodePembayaran,
    biayaAdmin: data.biayaAdmin,
    status: "menunggu_pembayaran",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateStatusPesanan(orderId: string, status: string) {
  await updateDoc(doc(db, "orders", orderId), { status });
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
