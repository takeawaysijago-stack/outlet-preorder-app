"use client";

import { useEffect, useState } from "react";
import type { AddOnGroup, AddOnOption, MenuItem } from "@/lib/types";
import { dengarkanMenu, tambahMenu, updateMenu, hapusMenu } from "@/lib/menuService";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

const FORM_KOSONG = {
  nama: "",
  deskripsi: "",
  harga: "",
  kategori: "",
  tersedia: true,
  addOnGroups: [] as AddOnGroup[],
};

export default function HalamanAdmin() {
  const [daftarMenu, setDaftarMenu] = useState<MenuItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [form, setForm] = useState(FORM_KOSONG);
  const [editId, setEditId] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = dengarkanMenu((items) => {
      setDaftarMenu(items);
      setMemuat(false);
    });
    return () => unsubscribe();
  }, []);

  function resetForm() {
    setForm(FORM_KOSONG);
    setEditId(null);
  }

  function mulaiEdit(item: MenuItem) {
    setEditId(item.id);
    setForm({
      nama: item.nama,
      deskripsi: item.deskripsi ?? "",
      harga: String(item.harga),
      kategori: item.kategori,
      tersedia: item.tersedia,
      addOnGroups: item.addOnGroups,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function simpanForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.nama.trim() || !form.kategori.trim() || !form.harga) {
      setError("Nama, kategori, dan harga wajib diisi.");
      return;
    }

    const data = {
      nama: form.nama.trim(),
      deskripsi: form.deskripsi.trim() || undefined,
      harga: Number(form.harga),
      kategori: form.kategori.trim(),
      tersedia: form.tersedia,
      addOnGroups: form.addOnGroups,
    };

    setMenyimpan(true);
    try {
      if (editId) {
        await updateMenu(editId, data);
      } else {
        await tambahMenu(data);
      }
      resetForm();
    } catch (err) {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapusItem(id: string) {
    if (!confirm("Hapus menu ini?")) return;
    await hapusMenu(id);
  }

  function tambahGroup() {
    const groupBaru: AddOnGroup = {
      id: crypto.randomUUID(),
      judul: "",
      wajibDipilih: false,
      pilihanMaksimal: 1,
      opsi: [],
    };
    setForm((f) => ({ ...f, addOnGroups: [...f.addOnGroups, groupBaru] }));
  }

  function updateGroup(groupId: string, patch: Partial<AddOnGroup>) {
    setForm((f) => ({
      ...f,
      addOnGroups: f.addOnGroups.map((g) =>
        g.id === groupId ? { ...g, ...patch } : g
      ),
    }));
  }

  function hapusGroup(groupId: string) {
    setForm((f) => ({
      ...f,
      addOnGroups: f.addOnGroups.filter((g) => g.id !== groupId),
    }));
  }

  function tambahOpsi(groupId: string) {
    const opsiBaru: AddOnOption = {
      id: crypto.randomUUID(),
      nama: "",
      hargaTambahan: 0,
    };
    updateGroup(groupId, {
      opsi: [
        ...(form.addOnGroups.find((g) => g.id === groupId)?.opsi ?? []),
        opsiBaru,
      ],
    });
  }

  function updateOpsi(
    groupId: string,
    opsiId: string,
    patch: Partial<AddOnOption>
  ) {
    const group = form.addOnGroups.find((g) => g.id === groupId);
    if (!group) return;
    updateGroup(groupId, {
      opsi: group.opsi.map((o) => (o.id === opsiId ? { ...o, ...patch } : o)),
    });
  }

  function hapusOpsi(groupId: string, opsiId: string) {
    const group = form.addOnGroups.find((g) => g.id === groupId);
    if (!group) return;
    updateGroup(groupId, { opsi: group.opsi.filter((o) => o.id !== opsiId) });
  }

  return (
    <main>
      <header className="app-header">
        <div className="eyebrow">Khusus staf</div>
        <h1>Kelola Menu</h1>
        <p className="subtitle">
          Tambah, ubah, atau hapus menu dan add-on-nya di sini.
        </p>
      </header>

      <section className="kategori-section">
        <form
          onSubmit={simpanForm}
          style={{
            background: "var(--color-card)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <strong>{editId ? "Edit Menu" : "Tambah Menu Baru"}</strong>

          <input
            placeholder="Nama menu"
            value={form.nama}
            onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            style={inputStyle}
          />
          <input
            placeholder="Deskripsi (opsional)"
            value={form.deskripsi}
            onChange={(e) =>
              setForm((f) => ({ ...f, deskripsi: e.target.value }))
            }
            style={inputStyle}
          />
          <input
            placeholder="Harga (contoh: 20000)"
            inputMode="numeric"
            value={form.harga}
            onChange={(e) => setForm((f) => ({ ...f, harga: e.target.value }))}
            style={inputStyle}
          />
          <input
            placeholder="Kategori (contoh: Makanan Utama)"
            value={form.kategori}
            onChange={(e) =>
              setForm((f) => ({ ...f, kategori: e.target.value }))
            }
            style={inputStyle}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.tersedia}
              onChange={(e) =>
                setForm((f) => ({ ...f, tersedia: e.target.checked }))
              }
            />
            Tersedia (tampil di menu customer)
          </label>

          <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13.5 }}>Add-on / Opsi Tambahan</strong>
              <button type="button" onClick={tambahGroup} style={linkBtnStyle}>
                + Grup Add-on
              </button>
            </div>

            {form.addOnGroups.map((group) => (
              <div
                key={group.id}
                style={{
                  background: "var(--color-bg)",
                  borderRadius: 12,
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    placeholder="Judul grup (contoh: Pilih Minuman)"
                    value={group.judul}
                    onChange={(e) =>
                      updateGroup(group.id, { judul: e.target.value })
                    }
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => hapusGroup(group.id)}
                    style={linkBtnStyle}
                  >
                    Hapus
                  </button>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={group.wajibDipilih}
                    onChange={(e) =>
                      updateGroup(group.id, { wajibDipilih: e.target.checked })
                    }
                  />
                  Wajib dipilih customer
                </label>

                {group.opsi.map((opsi) => (
                  <div key={opsi.id} style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      placeholder="Nama opsi (contoh: Es Teh)"
                      value={opsi.nama}
                      onChange={(e) =>
                        updateOpsi(group.id, opsi.id, { nama: e.target.value })
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      placeholder="+Rp"
                      inputMode="numeric"
                      value={opsi.hargaTambahan}
                      onChange={(e) =>
                        updateOpsi(group.id, opsi.id, {
                          hargaTambahan: Number(e.target.value) || 0,
                        })
                      }
                      style={{ ...inputStyle, width: 80 }}
                    />
                    <button
                      type="button"
                      onClick={() => hapusOpsi(group.id, opsi.id)}
                      style={linkBtnStyle}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => tambahOpsi(group.id)}
                  style={{ ...linkBtnStyle, marginTop: 6 }}
                >
                  + Opsi
                </button>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="submit" disabled={menyimpan} className="tambah-btn-lebar">
              {menyimpan ? "Menyimpan…" : editId ? "Simpan Perubahan" : "Tambah Menu"}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} style={linkBtnStyle}>
                Batal
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="kategori-section">
        <div className="kategori-title">Daftar Menu ({daftarMenu.length})</div>
        {memuat && <p style={{ color: "var(--color-ink-soft)" }}>Memuat…</p>}
        {daftarMenu.map((item) => (
          <div key={item.id} className={`menu-card ${!item.tersedia ? "habis" : ""}`}>
            <div className="info">
              <span className="nama">
                {item.nama}
                {!item.tersedia && <span className="badge-habis">Tidak tampil</span>}
              </span>
              <span className="deskripsi">{item.kategori}</span>
              <span className="harga">{formatRupiah(item.harga)}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => mulaiEdit(item)} style={linkBtnStyle}>
                Edit
              </button>
              <button onClick={() => hapusItem(item.id)} style={linkBtnStyle}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-line)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  width: "100%",
};

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-accent)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
