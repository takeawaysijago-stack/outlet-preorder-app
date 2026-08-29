// Midtrans akan panggil endpoint ini otomatis dari server mereka setiap
// status pembayaran berubah (dibayar, gagal, kadaluarsa, dst) -- terlepas
// apakah customer masih buka aplikasi atau tidak. Ini yang bikin update
// status jadi bisa diandalkan (bukan cuma dari pop-up di browser).

import crypto from "crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return Response.json({ error: "Server key belum diatur" }, { status: 500 });
    }

    // Verifikasi keaslian notifikasi -- WAJIB, supaya orang lain tidak bisa
    // pura-pura jadi Midtrans dan menandai pesanan "dibayar" secara curang.
    const signatureAsli = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (signatureAsli !== signature_key) {
      return Response.json({ error: "Signature tidak valid" }, { status: 403 });
    }

    let statusBaru: string | null = null;

    if (transaction_status === "capture" && fraud_status === "accept") {
      statusBaru = "dibayar";
    } else if (transaction_status === "settlement") {
      statusBaru = "dibayar";
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      statusBaru = "dibatalkan";
    }
    // Kalau "pending" (masih nunggu customer transfer VA), biarkan status
    // tetap "menunggu_pembayaran", tidak perlu diubah.

    if (statusBaru) {
      const db = getAdminDb();
      await db.collection("orders").doc(order_id).update({ status: statusBaru });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "Gagal memproses notifikasi" }, { status: 500 });
  }
}
