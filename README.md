# PANTAU-TB V10 — Clean Empty Start

Versi ini memakai namespace penyimpanan baru sehingga data dari V8/V9 tidak ikut terbaca. Kondisi awal wajib: 0 pasien terkonfirmasi, 0 suspek, indeks risiko tertinggi 0/100, dan seluruh lokasi publik 0%. Data baru tetap tersimpan selama demo melalui localStorage khusus V10.

# PANTAU-TB KAPITU — V9 Empty Start

Versi ini sengaja dimulai dari kondisi kosong untuk demonstrasi.

- Tidak ada pasien TB terkonfirmasi bawaan.
- Tidak ada suspek bawaan.
- Registry data dimulai dari 0.
- Batas KAPITU dan titik lokasi publik tetap tersedia.
- Seluruh lokasi publik mulai pada risiko 0%.
- Risk surface awal transparan / kosong.
- Risiko baru berubah setelah pengguna menambahkan suspek atau kasus terkonfirmasi.
- Riwayat kunjungan kasus terkonfirmasi dapat menaikkan skor lokasi publik.
- Tombol Reset mengembalikan sistem ke kondisi kosong.

## Menjalankan

```bash
python -m http.server 8000
```

Buka `http://localhost:8000`.
