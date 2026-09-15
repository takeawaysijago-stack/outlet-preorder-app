// API route ini jalan di server (bukan di browser).
//
// PENTING (keamanan): route ini TIDAK PERNAH memercayai harga yang dikirim
// dari browser. Semua harga dihitung ulang dari data menu asli di Firestore,
// supaya customer tidak bisa mengubah harga lewat developer tools/manipulasi
// request. Hasil hitungan ulang ini juga dipakai buat memperbaiki data
// pesanan yang tersimpan, jadi admin selalu lihat harga yang benar.
//
// Route ini juga yang menentukan kode unik (100-999) tiap pesanan, supaya
// nominal transfer manual tiap pesanan beda-beda dan gampang dicocokkan
// manual di mutasi rekening BRI.

import { getAdminDb, getAdminMessaging } from "@/lib/firebaseAdmin";
import { buatKodeUnik } from "@/lib/kodeUnik";
import type { OrderItem } from "@/lib/types";

type ItemMasuk = {
  menuId: string;
  qty: number;
  namaMenu: string;
  catatan?: string;
  addOnDipilih?: { groupId: string; opsiTerpilih: { id: string }[] }[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId: string;
      items: ItemMasuk[];
    };

    const db = getAdminDb();

    // Ambil data menu ASLI dari database -- ini sumber kebenaran satu-satunya
    const menuIds = [...new Set(body.items.map((it) => it.menuId))];
    const menuSnaps = await Promise.all(
      menuIds.map((id) => db.collection("menu").doc(id).get())
    );
    const menuMap = new Map(
      menuSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as any])
    );

    let subtotal = 0;
    const itemsTerverifikasi: OrderItem[] = [];

    for (const it of body.items) {
      const menuAsli = menuMap.get(it.menuId);
      if (!menuAsli) {
        return Response.json(
          { error: `Menu "${it.namaMenu}" sudah tidak tersedia. Silakan refresh keranjang.` },
          { status: 400 }
        );
      }

      let hargaSatuan = menuAsli.harga as number;
      const addOnDipilihAsli = (it.addOnDipilih ?? []).map((g) => {
        const groupAsli = (menuAsli.addOnGroups ?? []).find((gr: any) => gr.id === g.groupId);
        const opsiAsli = (g.opsiTerpilih ?? []).map((o) => {
          const opsi = groupAsli?.opsi.find((op: any) => op.id === o.id);
          const hargaTambahan = opsi?.hargaTambahan ?? 0;
          hargaSatuan += hargaTambahan;
          return { id: o.id, nama: opsi?.nama ?? "", hargaTambahan };
        });
        return {
          groupId: g.groupId,
          groupJudul: groupAsli?.judul ?? "",
          opsiTerpilih: opsiAsli,
        };
      });

      subtotal += hargaSatuan * it.qty;
      itemsTerverifikasi.push({
        menuId: it.menuId,
        namaMenu: menuAsli.nama,
        qty: it.qty,
        hargaSatuan,
        addOnDipilih: addOnDipilihAsli,
        catatan: it.catatan,
      });
    }

    const kodeUnik = await buatKodeUnik(db, body.orderId);
    const totalTransfer = subtotal + kodeUnik;

    // Perbaiki data pesanan yang tersimpan supaya sesuai harga asli --
    // menimpa apa pun yang mungkin sempat dimanipulasi dari sisi client --
    // dan sekaligus tetapkan kode unik & nominal transfer PAS-nya.
    await db.collection("orders").doc(body.orderId).update({
      items: itemsTerverifikasi,
      totalHarga: subtotal,
      kodeUnik,
      totalTransfer,
      metodePembayaran: "transfer_manual",
    });

    // Kirim notifikasi push ke HP admin yang sudah aktifkan notifikasi.
    // Sengaja dibungkus try/catch sendiri -- kalau gagal kirim notif,
    // checkout customer tetap harus sukses.
    try {
      const tokenSnaps = await db.collection("admin_push_tokens").get();
      const tokens = tokenSnaps.docs.map((d) => d.id);
      if (tokens.length > 0) {
        const ringkasanItem = itemsTerverifikasi
          .map((it) => `${it.qty}x ${it.namaMenu}`)
          .join(", ");
        const hasil = await getAdminMessaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "🍗 Pesanan Baru Masuk!",
            body: ringkasanItem || "Ada pesanan baru menunggu diproses.",
          },
        });

        // Bersihkan token yang udah gak valid (misal app di-uninstall/izin dicabut)
        const tokenMati: string[] = [];
        hasil.responses.forEach((r, i) => {
          const kode = r.error?.code;
          if (
            !r.success &&
            (kode === "messaging/registration-token-not-registered" ||
              kode === "messaging/invalid-registration-token")
          ) {
            tokenMati.push(tokens[i]);
          }
        });
        await Promise.all(
          tokenMati.map((t) => db.collection("admin_push_tokens").doc(t).delete())
        );
      }
    } catch {
      // Diamkan -- notifikasi gagal bukan alasan gagalin checkout
    }

    return Response.json({ totalHarga: subtotal, kodeUnik, totalTransfer });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "Error tidak diketahui";
    return Response.json({ error: `Gagal memproses pesanan: ${pesan}` }, { status: 500 });
  }
}
