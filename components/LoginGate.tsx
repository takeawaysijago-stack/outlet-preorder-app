"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
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
    // Tangkap hasil login setelah redirect balik dari Google
    getRedirectResult(auth).catch(() => {
      setError("Gagal masuk. Coba lagi sebentar.");
    });

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
      await signInWithRedirect(auth, provider);
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
        <img src="/logo.png" alt="Geprek Si Jago" className="brand-logo" />
        <header className="app-header" style={{ textAlign: "center", paddingTop: 10 }}>
          <h1>Geprek Si Jago</h1>
          <p className="subtitle">Masuk untuk mulai memesan.</p>
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
