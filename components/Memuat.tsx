"use client";

import { useEffect, useState } from "react";

const PESAN_DEFAULT = [
  "Lagi manasin minyak panas…",
  "Ayam lagi di-geprek dulu…",
  "Nyiapin sambelnya bentar…",
  "Hampir siap, sabar ya…",
];

// Komponen loading yang dipakai di semua halaman, gantiin teks "Memuat…"
// polos. Emoji-nya goyang-goyang dan pesannya gonta-ganti tiap ~1.8 detik
// biar nunggu kerasa lebih singkat.
export default function Memuat({ pesan }: { pesan?: string[] }) {
  const daftarPesan = pesan && pesan.length > 0 ? pesan : PESAN_DEFAULT;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (daftarPesan.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % daftarPesan.length);
    }, 1800);
    return () => clearInterval(t);
  }, [daftarPesan.length]);

  return (
    <div className="memuat-wrap">
      <div className="memuat-spinner" aria-hidden>
        🍗
      </div>
      <p className="memuat-teks">{daftarPesan[index]}</p>
    </div>
  );
}
