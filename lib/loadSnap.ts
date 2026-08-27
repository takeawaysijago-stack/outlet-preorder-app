// Snap.js adalah script dari Midtrans yang menampilkan pop-up pembayaran
// (pilih QRIS / Virtual Account, dst). Kita muat sekali saja saat dibutuhkan.

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.snap) return resolve();

    const isProduksi = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const src = isProduksi
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    const script = document.createElement("script");
    script.src = src;
    script.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
    );
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Snap.js"));
    document.body.appendChild(script);
  });
}
