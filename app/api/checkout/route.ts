// API route ini jalan di server (bukan di browser), supaya Server Key
// Midtrans tidak pernah terekspos ke customer. Frontend cuma kirim data
// pesanan ke sini, lalu route ini yang menghubungi Midtrans.

import type { OrderItem } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId: string;
      items: OrderItem[];
      total: number;
      namaCustomer: string | null;
      metode: "qris" | "va";
      biayaAdmin: number;
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return Response.json(
        { error: "MIDTRANS_SERVER_KEY belum diatur di Environment Variables." },
        { status: 500 }
      );
    }

    const isProduksi = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const baseUrl = isProduksi
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";

    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");

    const itemDetails = body.items.map((it) => ({
      id: it.menuId,
      price: it.hargaSatuan,
      quantity: it.qty,
      name: it.namaMenu.slice(0, 50),
    }));

    // Biaya admin ditambahkan sebagai baris item terpisah, supaya totalnya
    // (gross_amount) cocok dengan jumlah semua item_details -- ini wajib
    // sesuai aturan Midtrans.
    itemDetails.push({
      id: "biaya-admin",
      price: body.biayaAdmin,
      quantity: 1,
      name: "Biaya Admin Pembayaran",
    });

    const grossAmount = body.total + body.biayaAdmin;

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
