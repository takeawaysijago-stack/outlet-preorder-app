import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Admin ditentukan dari keberadaan dokumen di collection "admins",
// dengan ID dokumen = UID akun Google admin tersebut.
export async function cekAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}
