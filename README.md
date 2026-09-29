# PANTAU-TB

**PANTAU-TB** adalah prototipe aplikasi web untuk **klasifikasi probabilistik suspek Tuberkulosis (TB)** menggunakan **Naive Bayes** serta **visualisasi indeks pemantauan spasial** berbasis lokasi.

**Live Demo:** https://hananzhafirah.github.io/pantauTB/

---

## 1. Deskripsi Proyek

PANTAU-TB dikembangkan sebagai final project mata kuliah **Artificial Intelligence – DTETI Universitas Gadjah Mada**. Sistem menerapkan konsep **Uncertainty & Bayesian Reasoning**, khususnya **Naive Bayes Classification**, pada kasus skrining suspek TB.

Sistem memiliki dua komponen utama yang dipisahkan secara konseptual:

1. **Klasifikasi probabilistik individu suspek**
   - Menggunakan Naive Bayes.
   - Menghasilkan nilai posterior `P(TB | X)`.
   - Evidence berasal dari gejala dan faktor risiko individu.

2. **Visualisasi indeks pemantauan spasial**
   - Menampilkan distribusi kasus TB terkonfirmasi dan lokasi publik.
   - Memvisualisasikan overlap beberapa sumber pada peta.
   - Menggunakan parameter spasial prototipe.
   - **Bukan probabilitas klinis penularan TB.**

---

## 2. Problem Formalization

Permasalahan utama diformalkan sebagai **binary probabilistic classification**.

Kelas:

```text
C ∈ {TB, ¬TB}
```

Evidence individu:

```text
X = {x1, x2, ..., xn}
```

Evidence yang digunakan pada prototipe meliputi:

- riwayat kontak TB,
- batuk ≥ 14 hari,
- keringat malam,
- penurunan berat badan,
- demam berkepanjangan,
- merokok,
- diabetes,
- kepadatan hunian,
- ventilasi rumah,
- status gizi,
- usia ≥ 50 tahun.

Naive Bayes menghitung:

```text
P(C | X) ∝ P(C) × ∏ P(xi | C)
```

Untuk kelas TB:

```text
Score_TB = P(TB) × ∏ P(xi | TB)
```

Untuk kelas bukan TB:

```text
Score_notTB = P(¬TB) × ∏ P(xi | ¬TB)
```

Posterior akhirnya:

```text
P(TB | X) = Score_TB / (Score_TB + Score_notTB)
```

Kasus yang telah **TB terkonfirmasi tidak diklasifikasikan ulang menggunakan Naive Bayes**.

---

## 3. Fitur Utama

### Klasifikasi Suspek
Pengguna dapat menambahkan individu berstatus suspek dan mengisi gejala serta faktor risiko. Sistem kemudian menghitung probabilitas model `P(TB | X)`.

### Data Kasus Terkonfirmasi
Kasus TB terkonfirmasi dapat ditambahkan bersama informasi dasar, status potensi infeksius, dan riwayat kunjungan ke lokasi publik.

### Peta Interaktif
Peta menampilkan:

- titik kasus TB terkonfirmasi,
- titik suspek,
- lokasi publik,
- indeks pemantauan spasial,
- overlap kontribusi beberapa sumber.

### Indeks Lokasi Publik
Riwayat kunjungan kasus TB terkonfirmasi digunakan untuk membentuk **place monitoring index** berdasarkan faktor prototipe seperti:

- kondisi lingkungan,
- kepadatan,
- durasi kunjungan,
- status potensi infeksius.

Nilai ini adalah **indeks model**, bukan probabilitas seseorang tertular TB.

---

## 4. Struktur Proyek

```text
pantauTB/
├── index.html
├── records.html
├── methodology.html
├── styles.css
├── core.js
├── dashboard.js
├── common.js
├── methodology.js
├── seed-data.js
└── assets/
```

Keterangan file utama:

- `index.html` — halaman utama dan peta interaktif.
- `records.html` — registry data individu.
- `methodology.html` — penjelasan model dan metodologi.
- `core.js` — perhitungan Naive Bayes dan indeks spasial.
- `dashboard.js` — interaksi peta, form input, dan rendering.
- `seed-data.js` — data awal lokasi dan batas wilayah.
- `common.js` — fungsi pendukung antarmuka.
- `styles.css` — styling aplikasi.
- `assets/` — logo dan aset visual.

---

## 5. Cara Menjalankan

### Opsi A — Live Demo

Buka langsung:

**https://hananzhafirah.github.io/pantauTB/**

Tidak diperlukan instalasi tambahan.

### Opsi B — Menjalankan Secara Lokal

1. Clone repository:

```bash
git clone https://github.com/hananzhafirah/pantauTB.git
```

2. Masuk ke folder proyek:

```bash
cd pantauTB
```

3. Jalankan local web server, misalnya dengan Python:

```bash
python -m http.server 8000
```

4. Buka browser pada:

```text
http://localhost:8000
```

Disarankan menjalankan proyek melalui local server dan bukan membuka `index.html` langsung melalui `file://`.

---

## 6. Alur Penggunaan

### Menambahkan Suspek

1. Buka halaman **Peta Utama**.
2. Pilih menu untuk menambahkan individu.
3. Pilih status **Suspek**.
4. Isi gejala dan faktor risiko.
5. Pilih koordinat pada peta.
6. Simpan data.
7. Sistem menghitung dan menampilkan posterior Naive Bayes.

### Menambahkan Kasus TB Terkonfirmasi

1. Pilih status **TB Terkonfirmasi**.
2. Isi informasi dasar dan metode konfirmasi.
3. Isi status potensi infeksius.
4. Tambahkan riwayat lokasi publik yang pernah dikunjungi jika tersedia.
5. Isi durasi kunjungan.
6. Simpan data.
7. Peta dan indeks lokasi diperbarui.

---

## 7. Model Spasial

Model spasial menggunakan fungsi bobot jarak dengan pengaruh yang menurun ketika jarak dari sumber bertambah.

```text
w(d,R) = 0, jika d ≥ R
w(d,R) = x²(3 − 2x), jika d < R
x = 1 − d/R
```

Jika beberapa kontribusi saling overlap, nilai digabungkan dengan:

```text
Risk(q) = 1 − ∏(1 − ci(q))
```

Formulasi ini menghasilkan indeks yang meningkat secara gradual ketika beberapa sumber berada pada area yang sama.

> **Catatan:** radius, scaling coefficient, multiplier lingkungan, multiplier kepadatan, dan parameter spasial lainnya merupakan **heuristic/prototype parameters** dan belum dikalibrasi sebagai parameter epidemiologis.

---

## 8. Data dan Asal Parameter

Dataset yang digunakan pada prototipe merupakan **constructed dataset** untuk pengembangan dan demonstrasi algoritma.

Parameter Naive Bayes dihitung dari distribusi kelas dan frekuensi evidence pada dataset:

```text
P(TB) = N_TB / N
P(xi | TB) = N(xi ∩ TB) / N_TB
P(xi | ¬TB) = N(xi ∩ ¬TB) / N_¬TB
```

Pemilihan fitur mengacu pada faktor yang relevan dalam skrining dan investigasi kontak TB.

Untuk komponen spasial, literatur digunakan untuk mendukung **arah hubungan faktor**, seperti:

- infectiousness sumber,
- durasi/frekuensi pajanan,
- proximity,
- ventilasi,
- kondisi lingkungan.

Namun, nilai numerik tertentu pada spatial model masih merupakan **parameter desain prototipe**, bukan nilai klinis baku.

---

## 9. Keterbatasan

PANTAU-TB masih berupa **prototipe akademik** dan memiliki beberapa keterbatasan:

- Dataset individu masih berupa constructed dataset, bukan data pasien klinis nyata.
- Prior dan likelihood Naive Bayes bergantung pada distribusi dataset.
- Beberapa gejala/faktor risiko dapat saling berkorelasi, sedangkan Naive Bayes menggunakan asumsi conditional independence.
- Evidence yang digunakan masih terbatas dan belum memasukkan seluruh pemeriksaan klinis atau laboratorium.
- Parameter spasial belum dikalibrasi menggunakan data investigasi kontak nyata.
- Indeks pada peta **bukan probabilitas klinis penularan TB**.
- Sistem tidak dimaksudkan untuk menggantikan diagnosis oleh tenaga kesehatan.

---

## 10. Pengembangan Selanjutnya

Pengembangan berikutnya dapat mencakup:

- penggunaan dataset klinis terdeidentifikasi,
- validasi eksternal model,
- train-validation split atau cross-validation,
- evaluasi sensitivity, specificity, precision, recall, F1-score, dan calibration,
- kalibrasi parameter spasial menggunakan data investigasi kontak nyata,
- peningkatan perlindungan privasi dan tata kelola data kesehatan.

---

## 11. Referensi Utama

1. Kementerian Kesehatan Republik Indonesia, *Petunjuk Teknis Penatalaksanaan Tuberkulosis Sensitif Obat di Indonesia*, 2025.
2. Centers for Disease Control and Prevention, *Clinical Overview of Tuberculosis Disease*.
3. CDC and National Tuberculosis Controllers Association, *Guidelines for the Investigation of Contacts of Persons with Infectious Tuberculosis*, MMWR, 2005.
4. World Health Organization, *WHO Consolidated Guidelines on Tuberculosis: Module 1 — Prevention, Infection Prevention and Control*, 2022.
5. A. Asyary, A. Prasetyo, T. Eryando, and Y. Mahendradhata, “Predicting transmission of pulmonary tuberculosis in Daerah Istimewa Yogyakarta Province, Indonesia,” *Geospatial Health*, vol. 14, no. 1, 2019.

---

## 12. Disclaimer

PANTAU-TB dibuat untuk **keperluan pendidikan dan demonstrasi algoritma Artificial Intelligence**. Hasil klasifikasi maupun indeks spasial yang ditampilkan **tidak boleh digunakan sebagai diagnosis medis, prediksi penularan klinis, atau dasar tunggal pengambilan keputusan kesehatan**.

---

## Live Demo

**PANTAU-TB:** https://hananzhafirah.github.io/pantauTB/
