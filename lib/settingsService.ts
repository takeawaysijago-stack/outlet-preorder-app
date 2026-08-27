import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OperationalHours } from "@/lib/types";

const DOC_PATH = ["settings", "operasional"] as const;

const DEFAULT_SETTINGS: OperationalHours = {
  jamMulaiPesan: "09:00",
  jamBuka: "12:00",
  defaultMenitPenyiapan: 15,
};

export function dengarkanPengaturan(
  callback: (settings: OperationalHours) => void
) {
  const ref = doc(db, ...DOC_PATH);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as OperationalHours);
    } else {
      callback(DEFAULT_SETTINGS);
    }
  });
}

export async function simpanPengaturan(settings: OperationalHours) {
  const ref = doc(db, ...DOC_PATH);
  await setDoc(ref, settings, { merge: true });
}
