"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoginGate from "@/components/LoginGate";
import Memuat from "@/components/Memuat";
import LayarBayarManual from "@/components/LayarBayarManual";
import { dengarkanPesanan } from "@/lib/orderService";
import { LABEL_STATUS } from "@/lib/orderLabels";
import type { Order } from "@/lib/types";

export default function HalamanStatusPesanan() {
  return <LoginGate>{(user) => <IsiHalaman uid={user.uid} />}</LoginGate>;
}

function IsiHalaman({ uid }: { uid: string }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    return dengarkanPesanan(params.id, setOrder);
  }, [params.id]);

  // undefined = masih memuat, null = gak ketemu
  if (order === undefined) {
    return (
      <main>
        <Memuat pesan={["Lagi ambil data pesanan kamu…"]} />
      </main>
    );
  }

  if (order === null) {
    return (
      <main>
        <header className="app-header">
          <h1>Pesanan Gak Ketemu</h1>
        </header>
        <section className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>
            Pesanan ini gak ada atau sudah dihapus.
          </p>
          <button className="checkout-submit" onClick={() => router.push("/pesanan")}>
            Lihat Pesanan Saya
          </button>
        </section>
      </main>
    );
  }

  // Jaga-jaga: jangan sampai orang lain bisa buka halaman bayar pesanan orang lain
  if (order.uid !== uid) {
    return (
      <main>
        <header className="app-header">
          <h1>Gak Bisa Diakses</h1>
        </header>
        <section className="kategori-section">
          <p style={{ color: "var(--color-ink-soft)" }}>
            Pesanan ini bukan milik akunmu.
          </p>
        </section>
      </main>
    );
  }

  if (order.status === "menunggu_pembayaran" && order.kodeUnik != null && order.totalTransfer != null) {
    return (
      <LayarBayarManual
        orderId={order.id}
        kodeUnik={order.kodeUnik}
        totalTransfer={order.totalTransfer}
        onSelesai={() => router.push("/pesanan")}
      />
    );
  }

  // Status lain (sudah upload bukti, sedang diproses, dst) -- gak perlu
  // layar bayar lagi, arahkan ke daftar pesanan biasa.
  return (
    <main>
      <header className="app-header">
        <h1>Pesanan {LABEL_STATUS[order.status]}</h1>
      </header>
      <section className="kategori-section">
        <p style={{ color: "var(--color-ink-soft)" }}>
          Pesanan ini sudah di tahap &quot;{LABEL_STATUS[order.status]}&quot;,
          gak perlu bayar ulang.
        </p>
        <button className="checkout-submit" onClick={() => router.push("/pesanan")}>
          Lihat Pesanan Saya
        </button>
      </section>
    </main>
  );
}
