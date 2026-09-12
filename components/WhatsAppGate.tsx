"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import Memuat from "@/components/Memuat";

// Dipasang di bawah LoginGate, cuma di halaman customer (bukan admin).
// Begitu customer login Google, nomor WhatsApp-nya dicek ke Firestore
// (koleksi "pelanggan", key = uid Google-nya). Kalau belum ada, customer
// diminta isi SEKALI di sini, lalu tersimpan permanen ke akun Google itu --
// jadi biarpun ganti HP/browser, selama login pakai akun yang sama, nomor
// WA-nya sudah otomatis ada dan gak akan ditanya lagi.
export default function WhatsAppGate({
  user,
  children,
}: {
  user: User;
  children: (noHp: string) => React.ReactNode;
}) {
  const [noHp, setNoHp] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [input, setInput] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    getDoc(doc(db, "pelanggan", user.uid)).then((snap) => {
      if (batal) return;
      const data = snap.data();
      if (data?.noHp) setNoHp(data.noHp as string);
      setMemuat(false);
    });
    return () => {
      batal = true;
    };
  }, [user.uid]);

  async function simpanNoHp() {
    const bersih = input.replace(/[^0-9]/g, "");
    if (bersih.length < 9) {
      setError("Nomor WhatsApp wajib diisi dengan benar (minimal 9 digit).");
      return;
    }
    setError(null);
    setMenyimpan(true);
    try {
      await setDoc(
        doc(db, "pelanggan", user.uid),
        {
          noHp: input.trim(),
          namaCustomer: user.displayName ?? null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setNoHp(input.trim());
    } catch {
      setError("Gagal menyimpan nomor. Coba lagi.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) {
    return (
      <main>
        <Memuat pesan={["Lagi ngecek profil kamu…"]} />
      </main>
    );
  }

  if (!noHp) {
    return (
      <main>
        <header className="app-header" style={{ textAlign: "center" }}>
          <div className="eyebrow" style={{ textAlign: "center" }}>
            Satu langkah lagi
          </div>
          <h1>Nomor WhatsApp Kamu</h1>
          <p className="subtitle">
            Dipakai outlet buat konfirmasi pesanan. Cukup isi sekali ini aja,
            gak akan ditanya lagi tiap checkout.
          </p>
        </header>
        <div className="kategori-section">
          <input
            type="tel"
            className="jam-select"
            placeholder="Contoh: 081234567890"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          {error && (
            <p style={{ color: "var(--color-accent)", fontSize: 13, marginTop: 8 }}>
              {error}
            </p>
          )}
          <button
            className="checkout-submit"
            disabled={menyimpan}
            onClick={simpanNoHp}
          >
            {menyimpan ? "Menyimpan…" : "Simpan & Lanjut"}
          </button>
        </div>
      </main>
    );
  }

  return <>{children(noHp)}</>;
}
