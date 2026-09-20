"use client";

import { useEffect, useState } from "react";
import type { AddOnGroup, MenuItem } from "@/lib/types";
import { tambahKeKeranjang, type CartAddOnPilihan } from "@/lib/cart";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// Pilihan add-on untuk SATU porsi: groupId -> daftar optionId yang dipilih.
type PilihanGroup = Record<string, string[]>;

function cloneShallow<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

// Nambah/kurangin panjang array sesuai qty baru. Kalau nambah, porsi baru
// nyalin dari porsi terakhir yang sudah diisi (biar gak mulai dari kosong
// total tiap kali qty ditambah) -- pas nambah porsi ke-4 misalnya, defaultnya
// sama kayak porsi ke-3, tinggal admin/customer ubah yang beda aja.
function resizeArray<T>(arr: T[], size: number, buatBaru: () => T): T[] {
  if (arr.length === size) return arr;
  if (arr.length < size) {
    const tambahan = Array.from({ length: size - arr.length }, () =>
      arr.length > 0 ? cloneShallow(arr[arr.length - 1]) : buatBaru()
    );
    return [...arr, ...tambahan];
  }
  return arr.slice(0, size);
}

export default function AddOnModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);

  // ---- Mode SIMPEL (default): satu pilihan & satu catatan berlaku buat
  // semua porsi (qty) sekaligus. ----
  const [catatan, setCatatan] = useState("");
  const [pilihan, setPilihan] = useState<PilihanGroup>({});

  // ---- Mode MANUAL (opsional, aktif kalau qty >= 2 & customer klik toggle):
  // tiap porsi punya pilihan & catatan sendiri-sendiri. ----
  const [modeManual, setModeManual] = useState(false);
  const [pilihanPerPorsi, setPilihanPerPorsi] = useState<PilihanGroup[]>([]);
  const [catatanPerPorsi, setCatatanPerPorsi] = useState<string[]>([]);

  // Qty berubah -> sesuaikan panjang array per-porsi (kalau lagi mode
  // manual), dan otomatis balik ke mode simpel kalau qty turun jadi 1
  // (mode manual gak relevan lagi buat 1 porsi).
  useEffect(() => {
    if (qty < 2) {
      if (modeManual) {
        setPilihan(pilihanPerPorsi[0] ?? {});
        setCatatan(catatanPerPorsi[0] ?? "");
        setModeManual(false);
      }
      return;
    }
    if (!modeManual) return;
    setPilihanPerPorsi((prev) => resizeArray(prev, qty, () => ({})));
    setCatatanPerPorsi((prev) => resizeArray(prev, qty, () => ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty]);

  function toggleModeManual() {
    if (modeManual) {
      // Balik ke mode simpel -- pakai pilihan & catatan porsi pertama
      // sebagai default bersama.
      setPilihan(pilihanPerPorsi[0] ?? {});
      setCatatan(catatanPerPorsi[0] ?? "");
      setModeManual(false);
    } else {
      // Masuk mode manual -- semua porsi mulai dari pilihan & catatan yang
      // sudah dipilih sejauh ini, tinggal diubah yang mau beda aja.
      setPilihanPerPorsi(Array.from({ length: qty }, () => cloneShallow(pilihan)));
      setCatatanPerPorsi(Array.from({ length: qty }, () => catatan));
      setModeManual(true);
    }
  }

  function toggleOpsi(group: AddOnGroup, optionId: string) {
    setPilihan((prev) => ubahPilihan(prev, group, optionId));
  }

  function toggleOpsiPorsi(porsiIdx: number, group: AddOnGroup, optionId: string) {
    setPilihanPerPorsi((prev) =>
      prev.map((p, i) => (i === porsiIdx ? ubahPilihan(p, group, optionId) : p))
    );
  }

  function ubahPilihan(prev: PilihanGroup, group: AddOnGroup, optionId: string): PilihanGroup {
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
  }

  function hitungTambahan(p: PilihanGroup): number {
    return item.addOnGroups.reduce((sum, g) => {
      const dipilih = p[g.id] ?? [];
      return (
        sum +
        g.opsi
          .filter((o) => dipilih.includes(o.id))
          .reduce((s, o) => s + o.hargaTambahan, 0)
      );
    }, 0);
  }

  function bangunAddOnDipilih(p: PilihanGroup): CartAddOnPilihan[] {
    return item.addOnGroups
      .map((g) => {
        const ids = p[g.id] ?? [];
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
  }

  // Validasi & harga -- MODE SIMPEL
  const groupBelumLengkap = item.addOnGroups.filter(
    (g) => g.wajibDipilih && (pilihan[g.id]?.length ?? 0) === 0
  );
  const totalTambahanPerUnit = hitungTambahan(pilihan);
  const totalHargaSimpel = (item.harga + totalTambahanPerUnit) * qty;

  // Validasi & harga -- MODE MANUAL (per porsi)
  const porsiBelumLengkap = pilihanPerPorsi
    .map((p, idx) => ({
      idx,
      groups: item.addOnGroups.filter((g) => g.wajibDipilih && (p[g.id]?.length ?? 0) === 0),
    }))
    .find((x) => x.groups.length > 0);
  const totalHargaManual = pilihanPerPorsi.reduce(
    (sum, p) => sum + item.harga + hitungTambahan(p),
    0
  );

  const totalHarga = modeManual ? totalHargaManual : totalHargaSimpel;
  const belumLengkap = modeManual ? !!porsiBelumLengkap : groupBelumLengkap.length > 0;

  function submit() {
    if (belumLengkap) return;

    if (!modeManual) {
      tambahKeKeranjang({
        menuId: item.id,
        namaMenu: item.nama,
        hargaSatuanDasar: item.harga,
        addOnDipilih: bangunAddOnDipilih(pilihan),
        catatan: catatan.trim() || undefined,
        qty,
      });
      onClose();
      return;
    }

    // Mode manual: gabungkan porsi yang kombinasi opsi + catatannya SAMA
    // PERSIS jadi satu baris keranjang (qty digabung), biar keranjang gak
    // numpuk banyak baris qty:1 kalau ternyata beberapa porsi sama.
    const digabung = new Map<
      string,
      { addOnDipilih: CartAddOnPilihan[]; catatan?: string; qty: number }
    >();

    pilihanPerPorsi.forEach((p, idx) => {
      const addOnDipilih = bangunAddOnDipilih(p);
      const catatanPorsi = (catatanPerPorsi[idx] ?? "").trim() || undefined;
      const kunci = JSON.stringify({ a: addOnDipilih, c: catatanPorsi ?? "" });
      const ada = digabung.get(kunci);
      if (ada) {
        ada.qty += 1;
      } else {
        digabung.set(kunci, { addOnDipilih, catatan: catatanPorsi, qty: 1 });
      }
    });

    digabung.forEach((g) => {
      tambahKeKeranjang({
        menuId: item.id,
        namaMenu: item.nama,
        hargaSatuanDasar: item.harga,
        addOnDipilih: g.addOnDipilih,
        catatan: g.catatan,
        qty: g.qty,
      });
    });
    onClose();
  }

  function renderOpsiGroup(
    g: AddOnGroup,
    p: PilihanGroup,
    onToggle: (optionId: string) => void
  ) {
    return (
      <div key={g.id} className="modal-group">
        <div className="modal-group-title">
          {g.judul}
          {g.wajibDipilih && <span className="wajib-tag">Wajib</span>}
        </div>
        {g.opsi.map((o) => {
          const dipilih = (p[g.id] ?? []).includes(o.id);
          const habis = o.tersedia === false;
          return (
            <label
              key={o.id}
              className={`modal-opsi ${dipilih ? "dipilih" : ""}`}
              style={habis ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              <span>
                {o.nama}
                {o.hargaTambahan > 0 && ` (+${formatRupiah(o.hargaTambahan)})`}
                {habis && <span className="badge-habis" style={{ marginLeft: 6 }}>Habis</span>}
              </span>
              <input
                type={g.pilihanMaksimal <= 1 ? "radio" : "checkbox"}
                checked={dipilih}
                disabled={habis}
                onChange={() => !habis && onToggle(o.id)}
              />
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{item.nama}</h2>
        <div className="modal-harga">{formatRupiah(item.harga)}</div>

        <div className="modal-qty-row">
          <span>Jumlah</span>
          <div className="stepper">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="qty">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        </div>

        {qty >= 2 && (
          <button
            type="button"
            onClick={toggleModeManual}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              background: modeManual ? "var(--color-accent)" : "var(--color-accent-soft)",
              color: modeManual ? "#fff" : "var(--color-accent)",
              border: "none",
              borderRadius: "var(--radius-full)",
              padding: "10px 14px",
              margin: "2px 0 8px",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {modeManual
              ? "✓ Opsi beda per porsi aktif — klik buat samakan lagi"
              : "🍽️ Mau opsi beda-beda tiap porsi? Atur satu-satu"}
          </button>
        )}

        {!modeManual ? (
          <>
            {item.addOnGroups.map((g) => renderOpsiGroup(g, pilihan, (id) => toggleOpsi(g, id)))}

            <div className="modal-group">
              <div className="modal-group-title">Catatan (opsional)</div>
              <textarea
                className="modal-catatan"
                placeholder="Isi catatan kalau perlu"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>
          </>
        ) : (
          pilihanPerPorsi.map((p, idx) => (
            <div
              key={idx}
              style={{
                border: "1.5px solid var(--color-line)",
                borderRadius: "var(--radius-lg)",
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>
                Porsi {idx + 1} dari {qty}
              </div>

              {item.addOnGroups.map((g) =>
                renderOpsiGroup(g, p, (id) => toggleOpsiPorsi(idx, g, id))
              )}

              <div className="modal-group" style={{ marginBottom: 0 }}>
                <div className="modal-group-title">Catatan porsi ini (opsional)</div>
                <textarea
                  className="modal-catatan"
                  placeholder="Isi catatan kalau perlu"
                  value={catatanPerPorsi[idx] ?? ""}
                  onChange={(e) =>
                    setCatatanPerPorsi((prev) =>
                      prev.map((c, i) => (i === idx ? e.target.value : c))
                    )
                  }
                />
              </div>
            </div>
          ))
        )}

        <button className="modal-submit" onClick={submit} disabled={belumLengkap}>
          {modeManual && porsiBelumLengkap
            ? `Porsi ${porsiBelumLengkap.idx + 1}: pilih dulu ${porsiBelumLengkap.groups[0].judul}`
            : !modeManual && groupBelumLengkap.length > 0
            ? `Pilih dulu: ${groupBelumLengkap[0].judul}`
            : `Tambah · ${formatRupiah(totalHarga)}`}
        </button>
      </div>
    </div>
  );
}
