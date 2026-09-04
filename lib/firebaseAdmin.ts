// Firebase Admin SDK -- HANYA dipakai di server (API routes), tidak pernah
// di browser. Ini yang bikin webhook Midtrans bisa update status pesanan
// di Firestore tanpa perlu "login" sebagai siapa pun (karena Midtrans server
// yang manggil, bukan customer).

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Private key disimpan di env var dengan \n literal, perlu diubah jadi baris baru asli
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Kredensial Firebase Admin belum lengkap di Environment Variables.");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let sudahDiatur = false;

export function getAdminDb() {
  const app = initAdmin();
  const db = getFirestore(app);
  if (!sudahDiatur) {
    // Field yang nilainya undefined (misal catatan yang tidak diisi customer)
    // otomatis diabaikan, tidak bikin error -- sama seperti di client SDK.
    db.settings({ ignoreUndefinedProperties: true });
    sudahDiatur = true;
  }
  return db;
}
