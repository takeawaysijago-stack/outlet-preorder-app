"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  async function masukDenganGoogle() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError("Gagal masuk. Coba lagi sebentar.");
    }
  }

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
        <header className="app-header">
          <div className="eyebrow">Pesan sekarang, ambil tanpa antre</div>
          <h1>Selamat Datang</h1>
          <p className="subtitle">
            Masuk dengan akun Google untuk mulai memesan.
          </p>
        </header>
        <div className="kategori-section" style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={masukDenganGoogle} className="tambah-btn-lebar">
            Masuk dengan Google
          </button>
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
        <button className="keluar-btn" onClick={() => signOut(auth)}>
          Keluar
        </button>
      </div>
      {children(user)}
    </>
  );
}
