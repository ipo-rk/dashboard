Manual UI Testing Checklist
==========================

1) Persiapan
   - Pastikan server dijalankan di `server/`:
     ```powershell
     cd "c:\Users\Asus TUF\Documents\Sacode 2025\Latihan\dashboard\server"
     npm install
     npm run dev
     ```
   - Buka browser ke `http://localhost:5000`.

2) Login
   - Buka `http://localhost:5000/login.html`.
   - Login dengan: email `tester+1@example.com`, password `Test12345`.
   - Verifikasi: setelah login diarahkan ke `dashboard.html` dan token tersimpan di `localStorage` (`auth_token`, `auth_user`).

3) Produk - CRUD
   - Tambah produk:
     - Klik "Tambah Produk Baru", isi nama, harga, set gambar (opsional), lalu Simpan.
     - Verifikasi produk muncul di daftar dan /api/products menampilkan item baru.
   - Edit produk:
     - Klik Edit pada salah satu produk; ubah nama/harga; Simpan.
     - Verifikasi perubahan di UI dan endpoint GET `/api/products/:id`.
   - Hapus produk:
     - Klik Hapus, konfirmasi.
     - Verifikasi produk tidak lagi muncul dan file gambar lama terhapus dari `/server/uploads` (jika ada).

4) Halaman & fitur lain
   - Pastikan sidebar navigasi menandai halaman aktif.
   - Buka `analytics.html` — periksa Chart.js muncul dan chart ter-render.
   - Buka `customers.html`, `messages.html`, `settings.html` — fungsi inisialisasi berjalan.

5) Debugging
   - Buka DevTools -> Console: periksa tidak ada error runtime (Uncaught, ReferenceError).
   - Network tab: periksa 200 pada `assets/js/app-core.js`, `assets/js/dashboard.js`, `assets/js/script.js`.

6) Automasi ringan
   - Jalankan skrip otomatis yang saya tambahkan (lihat `scripts/test-api-pages.ps1`) untuk pengecekan cepat:
     ```powershell
     cd "c:\Users\Asus TUF\Documents\Sacode 2025\Latihan\dashboard"
     powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-api-pages.ps1
     ```
   - Hasil akan ditulis ke `tests/ui-pages-check.json`.

Catatan: beberapa pemeriksaan terbaik dilakukan interaktif di browser (cek console, chart rendering, modal behavior).
