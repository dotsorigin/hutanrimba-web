# KTP Rimba

Website https://hutanrimbanet.com untuk follower @hutanrimbanet: cari username IG, ambil KTP Rimba, pasang di story.

- `index.html` halaman dan gambar kartu (canvas)
- `data.js` daftar warga, spesies, distrik, statistik
- `img/` gambar clay hewan dan distrik

## Republik Hutan Rimba (dunia 3D)

Halaman `/republik/` berisi game dunia Hutan Rimba. Game memakai `data.js` dan `img/` yang sama dengan halaman KTP, jadi warga baru otomatis ikut muncul.

- `republik/index.html`, `republik/hutan.js` game
- `republik/config.js` sambungan Supabase. Kosong = progres disimpan di HP saja.
- `supabase/schema.sql` tabel dan fungsi server. Jalankan sekali di Supabase SQL Editor.

Admin (dari Supabase SQL Editor):

- Lupa Kode Warga: `select reset_kode('username');` lalu kirim kode barunya lewat DM.
- Cabut klaim username yang salah: `select cabut_klaim('username');`
