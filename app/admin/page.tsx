export default function HalamanAdmin() {
  return (
    <main>
      <header className="receipt-header">
        <div className="eyebrow">Khusus staf</div>
        <h1>Dashboard Kasir</h1>
        <p className="subtitle">
          Kelola menu, pantau pesanan masuk, dan atur jam operasional.
        </p>
      </header>

      <section className="kategori-section">
        <p style={{ color: "var(--color-ink-soft)", fontSize: 14 }}>
          Login dan pengelolaan pesanan akan ditambahkan di langkah
          berikutnya, setelah project ini tersambung ke Firebase.
        </p>
      </section>
    </main>
  );
}
