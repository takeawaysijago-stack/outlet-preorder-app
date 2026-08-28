"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cekAdmin } from "@/lib/adminService";

export default function AdminGuard({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"memuat" | "admin" | "ditolak">("memuat");

  useEffect(() => {
    let aktif = true;
    cekAdmin(user.uid).then((ok) => {
      if (aktif) setStatus(ok ? "admin" : "ditolak");
    });
    return () => {
      aktif = false;
    };
  }, [user.uid]);

  if (status === "memuat") {
    return (
      <main>
        <div className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>Memeriksa akses…</p>
        </div>
      </main>
    );
  }

  if (status === "ditolak") {
    return (
      <main>
        <header className="app-header">
          <h1>Akses Ditolak</h1>
          <p className="subtitle">
            Akun ({user.email}) ini tidak terdaftar sebagai admin.
          </p>
        </header>
        <div className="kategori-section">
          <button className="tambah-btn-lebar" onClick={() => signOut(auth)}>
            Keluar
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
