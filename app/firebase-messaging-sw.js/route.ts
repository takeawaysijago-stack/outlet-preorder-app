// Service worker buat notifikasi push (FCM) waktu app lagi ketutup/background.
// Sengaja dibuat sebagai route (bukan file statis di /public) supaya bisa baca
// env var NEXT_PUBLIC_FIREBASE_* yang sama dengan lib/firebase.ts, tanpa perlu
// ditulis ulang manual di sini.

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const js = `
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const judul = (payload.notification && payload.notification.title) || "Pesanan Baru";
  const opsi = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/logo.png",
    vibrate: [400, 100, 400, 100, 400],
  };
  self.registration.showNotification(judul, opsi);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/admin"));
});
`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
