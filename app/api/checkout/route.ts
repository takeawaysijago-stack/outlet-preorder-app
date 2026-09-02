// API route ini jalan di server (bukan di browser), supaya Server Key
// Midtrans tidak pernah terekspos ke customer.
//
// PENTING (keamanan): route ini TIDAK PERNAH memercayai harga yang dikirim
// dari browser. Semua harga dihitung ulang dari data menu asli di Firestore,
// supaya customer tidak bisa mengubah harga lewat developer tools/manipulasi
// request. Hasil hitungan ulang ini juga dipakai buat memperbaiki data
// pesanan yang tersimpan, jadi admin selalu lihat harga yang benar.

import { getAdminDb } from "@/lib/firebaseAdmin";
import { hitungBiayaAdmin, type MetodeBayar } from "@/lib/biayaAdmin";
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
      namaCustomer: string | null;
      metode: MetodeBayar;
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return Response.json(
        { error: "MIDTRANS_SERVER_KEY belum diatur di Environment Variables." },
        { status: 500 }
      );
    }

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

    const biayaAdmin = hitungBiayaAdmin(body.metode, subtotal);
    const grossAmount = subtotal + biayaAdmin;

    // Perbaiki data pesanan yang tersimpan supaya sesuai harga asli --
    // menimpa apa pun yang mungkin sempat dimanipulasi dari sisi client
    await db.collection("orders").doc(body.orderId).update({
      items: itemsTerverifikasi,
      totalHarga: subtotal,
      biayaAdmin,
    });

    const isProduksi = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const baseUrl = isProduksi
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";
    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");

    const itemDetails = itemsTerverifikasi.map((it) => ({
      id: it.menuId,
      price: it.hargaSatuan,
      quantity: it.qty,
      name: it.namaMenu.slice(0, 50),
    }));
    itemDetails.push({
      id: "biaya-admin",
      price: biayaAdmin,
      quantity: 1,
      name: "Biaya Admin Pembayaran",
    });

    const enabledPayments =
      body.metode === "qris"
        ? ["qris"]
        : ["bca_va", "bni_va", "bri_va", "permata_va", "other_va"];

    const payload = {
      transaction_details: {
        order_id: body.orderId,
        gross_amount: grossAmount,
      },
      language: "id",
      item_details: itemDetails,
      customer_details: {
        first_name: body.namaCustomer || "Customer",
      },
      enabled_payments: enabledPayments,
    };

    const res = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data }, { status: 500 });
    }

    return Response.json({ token: data.token, redirect_url: data.redirect_url });
  } catch (err) {
    return Response.json({ error: "Gagal menghubungi Midtrans." }, { status: 500 });
  }
}
