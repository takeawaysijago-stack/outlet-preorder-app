// Kompres foto bukti transfer di browser customer sebelum disimpan, supaya
// muat sebagai teks (base64) langsung di dalam dokumen Firestore -- gak
// perlu Firebase Storage sama sekali (yang sekarang wajib paket Blaze/kartu
// kredit). Firestore membatasi 1 dokumen maksimal ~1MB, jadi hasil akhirnya
// dijaga di bawah itu.

const MAKS_KARAKTER = 700_000; // ~700KB, aman di bawah batas 1MB per dokumen Firestore

export async function kompresGambarKeBase64(file: File): Promise<string> {
  const img = await muatGambar(file);

  // Coba beberapa tingkat kompresi, dari yang paling bagus kualitasnya.
  // Begitu ukurannya sudah cukup kecil, langsung dipakai.
  const percobaan = [
    { maxDimensi: 1000, kualitas: 0.7 },
    { maxDimensi: 800, kualitas: 0.55 },
    { maxDimensi: 600, kualitas: 0.4 },
    { maxDimensi: 480, kualitas: 0.35 },
  ];

  let hasil = "";
  for (const p of percobaan) {
    hasil = gambarKeDataUrl(img, p.maxDimensi, p.kualitas);
    if (hasil.length <= MAKS_KARAKTER) return hasil;
  }

  throw new Error(
    "Foto terlalu besar walau sudah dikompres. Coba screenshot ulang dengan resolusi lebih kecil ya."
  );
}

function muatGambar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca file gambar. Coba pilih foto lain."));
    };
    img.src = url;
  });
}

function gambarKeDataUrl(img: HTMLImageElement, maxDimensi: number, kualitas: number): string {
  let { width, height } = img;
  if (width > height && width > maxDimensi) {
    height = Math.round((height * maxDimensi) / width);
    width = maxDimensi;
  } else if (height >= width && height > maxDimensi) {
    width = Math.round((width * maxDimensi) / height);
    height = maxDimensi;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar ini.");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", kualitas);
}
