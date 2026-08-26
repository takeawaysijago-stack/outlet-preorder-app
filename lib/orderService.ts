import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OrderItem } from "@/lib/types";

export async function buatPesanan(data: {
  uid: string;
  namaCustomer: string | null;
  items: OrderItem[];
  totalHarga: number;
  jamAmbil: string;
}) {
  const ref = await addDoc(collection(db, "orders"), {
    uid: data.uid,
    namaCustomer: data.namaCustomer,
    items: data.items,
    totalHarga: data.totalHarga,
    jamAmbil: data.jamAmbil,
    status: "menunggu_pembayaran",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}
