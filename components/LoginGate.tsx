"use client";

import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

export default function LoginGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tombolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (memuat || user) return;

    loadGsiScript().then(() => {
      if (!window.google || !tombolRef.current) return;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        callback: async (response) => {
          try {
            const credential = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(auth, credential);
          } catch (e) {
            setError("Gagal masuk. Coba lagi sebentar.");
          }
        },
      });

      window.google.accounts.id.renderButton(tombolRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 280,
      });
    });
  }, [memuat, user]);

  if (memuat) {
    return (
      <main>
        <div className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>Memuat…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <img src="/logo.png" alt="Geprek Si Jago" className="brand-logo" />
        <header className="app-header" style={{ textAlign: "center", paddingTop: 10 }}>
          <div className="eyebrow" style={{ textAlign: "center" }}>Geprek Si Jago</div>
          <h1 className="login-tagline">Pesan · Bayar · Tinggal Ambil</h1>
          <p className="subtitle">
            Pesan dari rumah → bayar → datang → tinggal ambil.
          </p>
        </header>
        <div className="kategori-section" style={{ textAlign: "center", marginTop: 8 }}>
          <div className="peringatan-delivery">
            ⚠️ Bukan layanan delivery. Pesanan diambil langsung di outlet.
          </div>
        </div>
        <div className="kategori-section" style={{ textAlign: "center", marginTop: 12 }}>
          <div ref={tombolRef} style={{ display: "flex", justifyContent: "center" }} />
          {error && (
            <p style={{ color: "var(--color-accent)", fontSize: 13, marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="top-bar">
        <span>Halo, {user.displayName?.split(" ")[0] ?? "Customer"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/pesanan" className="keluar-btn" style={{ textDecoration: "none" }}>
            Pesanan Saya
          </Link>
          <button className="keluar-btn" onClick={() => signOut(auth)}>
            Keluar
          </button>
        </div>
      </div>
      {children(user)}
    </>
  );
}
