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
        <header className="receipt-header">
          <div className="eyebrow">Pesan sekarang, ambil tanpa antre</div>
          <h1>Selamat Datang</h1>
          <p className="subtitle">
            Masuk dengan akun Google untuk mulai memesan.
          </p>
        </header>
        <div className="kategori-section" style={{ textAlign: "center" }}>
          <button
            onClick={masukDenganGoogle}
            style={{
              background: "var(--color-accent)",
              color: "white",
              border: "none",
              padding: "12px 22px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          fontSize: 13,
          color: "var(--color-ink-soft)",
          borderBottom: "1px solid var(--color-line)",
        }}
      >
        <span>Halo, {user.displayName?.split(" ")[0] ?? "Customer"}</span>
        <button
          onClick={() => signOut(auth)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-accent)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 13,
          }}
        >
          Keluar
        </button>
      </div>
      {children(user)}
    </>
  );
}
