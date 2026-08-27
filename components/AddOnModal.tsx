"use client";

import { useState } from "react";
import type { AddOnGroup, MenuItem } from "@/lib/types";
import { tambahKeKeranjang, type CartAddOnPilihan } from "@/lib/cart";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

export default function AddOnModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [catatan, setCatatan] = useState("");
  const [pilihan, setPilihan] = useState<Record<string, string[]>>({});

  function toggleOpsi(group: AddOnGroup, optionId: string) {
    setPilihan((prev) => {
      const current = prev[group.id] ?? [];
      if (group.pilihanMaksimal <= 1) {
        return {
          ...prev,
          [group.id]: current.includes(optionId) ? [] : [optionId],
        };
      }
      const sudahAda = current.includes(optionId);
      if (sudahAda) {
        return { ...prev, [group.id]: current.filter((o) => o !== optionId) };
      }
      if (current.length >= group.pilihanMaksimal) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  const groupBelumLengkap = item.addOnGroups.filter(
    (g) => g.wajibDipilih && (pilihan[g.id]?.length ?? 0) === 0
  );

  const totalTambahanPerUnit = item.addOnGroups.reduce((sum, g) => {
    const dipilih = pilihan[g.id] ?? [];
    return (
      sum +
      g.opsi
        .filter((o) => dipilih.includes(o.id))
        .reduce((s, o) => s + o.hargaTambahan, 0)
    );
  }, 0);

  const totalHarga = (item.harga + totalTambahanPerUnit) * qty;

  function submit() {
    if (groupBelumLengkap.length > 0) return;

    const addOnDipilih: CartAddOnPilihan[] = item.addOnGroups
      .map((g) => {
        const ids = pilihan[g.id] ?? [];
        if (ids.length === 0) return null;
        return {
          groupId: g.id,
          groupJudul: g.judul,
          opsiTerpilih: g.opsi
            .filter((o) => ids.includes(o.id))
            .map((o) => ({ id: o.id, nama: o.nama, hargaTambahan: o.hargaTambahan })),
        };
      })
      .filter((x): x is CartAddOnPilihan => x !== null);

    tambahKeKeranjang({
      menuId: item.id,
      namaMenu: item.nama,
      hargaSatuanDasar: item.harga,
      addOnDipilih,
      catatan: catatan.trim() || undefined,
      qty,
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{item.nama}</h2>
        <div className="modal-harga">{formatRupiah(item.harga)}</div>

        {item.addOnGroups.map((g) => (
          <div key={g.id} className="modal-group">
            <div className="modal-group-title">
              {g.judul}
              {g.wajibDipilih && <span className="wajib-tag">Wajib</span>}
            </div>
            {g.opsi.map((o) => {
              const dipilih = (pilihan[g.id] ?? []).includes(o.id);
              return (
                <label
                  key={o.id}
                  className={`modal-opsi ${dipilih ? "dipilih" : ""}`}
                >
                  <span>
                    {o.nama}
                    {o.hargaTambahan > 0 &&
                      ` (+${formatRupiah(o.hargaTambahan)})`}
                  </span>
                  <input
                    type={g.pilihanMaksimal <= 1 ? "radio" : "checkbox"}
                    checked={dipilih}
                    onChange={() => toggleOpsi(g, o.id)}
                  />
                </label>
              );
            })}
          </div>
        ))}

        <div className="modal-group">
          <div className="modal-group-title">Catatan (opsional)</div>
          <textarea
            className="modal-catatan"
            placeholder="Contoh: pedas level 2, tanpa bawang"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>

        <div className="modal-qty-row">
          <span>Jumlah</span>
          <div className="stepper">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="qty">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        </div>

        <button
          className="modal-submit"
          onClick={submit}
          disabled={groupBelumLengkap.length > 0}
        >
          {groupBelumLengkap.length > 0
            ? `Pilih dulu: ${groupBelumLengkap[0].judul}`
            : `Tambah · ${formatRupiah(totalHarga)}`}
        </button>
      </div>
    </div>
  );
}
