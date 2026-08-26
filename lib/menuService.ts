// Kumpulan fungsi untuk baca/tulis data menu ke Firestore.
// Dipakai oleh halaman customer (baca saja) dan halaman admin (baca + tulis).

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MenuItem } from "@/lib/types";

const KOLEKSI_MENU = "menu";

// Mendengarkan perubahan data menu secara real-time.
// Setiap kali ada perubahan di Firestore (admin tambah/edit/hapus),
// callback ini otomatis dipanggil lagi dengan data terbaru.
export function dengarkanMenu(callback: (items: MenuItem[]) => void) {
  const q = query(collection(db, KOLEKSI_MENU), orderBy("kategori"));
  return onSnapshot(q, (snapshot) => {
    const items: MenuItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MenuItem, "id">),
    }));
    callback(items);
  });
}

export async function tambahMenu(data: Omit<MenuItem, "id">) {
  await addDoc(collection(db, KOLEKSI_MENU), data);
}

export async function updateMenu(id: string, data: Omit<MenuItem, "id">) {
  await updateDoc(doc(db, KOLEKSI_MENU, id), data);
}

export async function hapusMenu(id: string) {
  await deleteDoc(doc(db, KOLEKSI_MENU, id));
}
