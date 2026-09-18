"use client";

import { getApp } from "firebase/app";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Diisi dari Firebase Console > Project Settings > Cloud Messaging >
// Web configuration > Web Push certificates (generate kalau belum ada).
const VAPID_KEY = "BETDh9z7B8PxRys1IoTFJP2tQpzG-qazh6_mSTyvfhOsWRqmP_6VZU548NKsLCRniHhsqTSuI8rDpM6NcxTseg8";

export async function aktifkanNotifikasiHP(): Promise<{ ok: boolean; pesan: string }> {
  if (typeof window === "undefined") return { ok: false, pesan: "Tidak didukung." };

  try {
    const { isSupported, getMessaging, getToken } = await import("firebase/messaging");

    const didukung = await isSupported();
    if (!didukung) {
      return { ok: false, pesan: "Browser ini belum mendukung notifikasi push." };
    }

    const izin = await Notification.requestPermission();
    if (izin !== "granted") {
      return {
        ok: false,
        pesan: "Izin notifikasi ditolak. Aktifkan lewat pengaturan browser kalau berubah pikiran.",
      };
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { ok: false, pesan: "Gagal mendapatkan token notifikasi. Coba lagi." };
    }

    await setDoc(doc(db, "admin_push_tokens", token), {
      token,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, pesan: "Notifikasi HP aktif! Coba tutup app, pesanan baru harusnya tetap muncul." };
  } catch (e) {
    const pesan = e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.";
    return { ok: false, pesan: `Gagal: ${pesan}` };
  }
}

// Dipanggil dari dashboard admin -- kalau app lagi KEBUKA (foreground),
// FCM gak otomatis munculin notifikasi OS, jadi kita tangkap manual di sini
// dan pakai buat trigger alarm bunyi yang sudah ada.
export function dengarkanPesanForeground(callback: (judul: string, isi: string) => void) {
  if (typeof window === "undefined") return () => {};

  let batal = false;
  let lepasListener = () => {};

  import("firebase/messaging").then(async ({ isSupported, getMessaging, onMessage }) => {
    if (batal) return;
    const didukung = await isSupported();
    if (!didukung || batal) return;
    const messaging = getMessaging(getApp());
    lepasListener = onMessage(messaging, (payload) => {
      callback(payload.notification?.title ?? "Notifikasi", payload.notification?.body ?? "");
    });
  });

  return () => {
    batal = true;
    lepasListener();
  };
}
