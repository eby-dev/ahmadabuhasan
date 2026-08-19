---
title: 'Kenapa Aplikasi Absensi Tidak Boleh Percaya Jam HP'
description: 'Catatan dari membangun aplikasi absensi untuk sekolah dan pesantren: jam perangkat bisa diubah siapa saja, dan bagaimana TrueTime menutup celah itu.'
publishedAt: 2023-04-15
draft: true
tags: ['android', 'kotlin', 'attendance']
---

<!--
DRAFT — kerangka dari data experience/project kamu. Belum bisa dipublish.

Yang perlu kamu lakukan:
1. Cek semua yang saya tandai [KONFIRMASI] — saya menyimpulkan dari file
   experience dan project, bukan dari ingatan kamu.
2. Isi bagian [ISI SENDIRI] — angka, kejadian nyata, keputusan yang kamu ambil.
   Itu bagian yang bikin tulisan ini bernilai; saya tidak bisa mengarangnya.
3. Hapus komentar ini dan semua penanda, ubah `draft: false`, lalu build.

Kalau ada yang salah, koreksi saja — ini bahan mentah, bukan hasil akhir.
-->

Waktu magang di Indoweb.id, saya kebagian membangun aplikasi absensi karyawan
untuk dua ekosistem: ePesantren untuk pondok pesantren, dan AdminSekolah untuk
sekolah. Fiturnya terdengar sederhana — karyawan buka aplikasi, absen masuk,
selesai.

Yang tidak sederhana adalah satu pertanyaan yang muncul belakangan: **kalau
absensi mencatat waktu, waktu siapa yang kita catat?**

## Masalahnya: jam HP itu milik pengguna

Cara paling gampang mencatat absensi adalah pakai `System.currentTimeMillis()`
di perangkat. Ambil waktu, kirim ke server, simpan.

Masalahnya, jam perangkat bisa diubah siapa saja tanpa akses khusus — buka
Settings, matikan waktu otomatis, geser jamnya. Tidak perlu root, tidak perlu
aplikasi tambahan. Kalau aplikasi absensi percaya angka itu, karyawan yang
datang jam 9 bisa mencatat dirinya masuk jam 7.

Untuk aplikasi biasa ini tidak penting. Untuk aplikasi yang datanya dipakai
menghitung kedisiplinan — dan mungkin gaji — ini melubangi seluruh gunanya.

[KONFIRMASI] Apakah celah ini ketemu saat testing, atau ada yang benar-benar
melakukannya di produksi? Kalau ada kejadian nyata, itu pembuka yang jauh lebih
kuat daripada penjelasan teoretis.

## Kenapa tidak pakai waktu server saja

Solusi paling jelas: jangan kirim waktu dari perangkat, biarkan server yang
mencatat waktu saat request masuk.

[ISI SENDIRI] Ini yang saya tidak tahu dan cuma kamu yang tahu: kenapa
pendekatan ini tidak cukup? Beberapa kemungkinan yang biasa jadi alasan —
pilih yang benar, atau tulis alasan sebenarnya:

- Aplikasi harus bisa absen saat sinyal jelek, waktunya direkam dulu di
  perangkat lalu dikirim belakangan
- Waktu perlu ditampilkan ke pengguna sebelum request dikirim
- API-nya sudah ada dan mengharapkan timestamp dari klien
- Alasan lain

Bagian ini penting. Pembaca yang paham langsung bertanya "kenapa tidak server
saja?", dan kalau tidak dijawab, tulisan ini kehilangan kredibilitasnya.

## TrueTime: ambil waktu dari NTP, bukan dari perangkat

Yang akhirnya kami pakai adalah [TrueTime](https://github.com/instacart/truetime-android).
Cara kerjanya: sekali saat aplikasi jalan, ia menanyakan waktu ke server NTP,
lalu menghitung selisihnya terhadap `SystemClock.elapsedRealtime()` — penghitung
yang jalan sejak perangkat booting dan **tidak bisa diubah dari Settings**.

Setelah itu, waktu yang dipakai selalu hasil hitungan dari selisih tadi. Pengguna
menggeser jam perangkat, angka yang dipakai aplikasi tidak berubah.

```kotlin
// [KONFIRMASI] ganti dengan kode yang benar-benar kamu pakai —
// pola inisialisasi TrueTime beda-beda antar versi.
if (TrueTimeRx.isInitialized()) {
    val trustedNow = TrueTimeRx.now()   // aman dari perubahan jam perangkat
} else {
    // [ISI SENDIRI] apa yang kamu lakukan di sini?
    // Tolak absensi? Paksa pakai waktu server? Coba inisialisasi ulang?
    // Keputusan ini yang paling menarik dari seluruh tulisan.
}
```

## Bagian yang tidak ada di dokumentasi

[ISI SENDIRI] Ini inti tulisannya — hal yang cuma didapat dari benar-benar
mengirim aplikasi ini ke pengguna. Beberapa pemicu, jawab yang kamu ingat:

- **Kalau inisialisasi NTP gagal, apa yang terjadi?** Sinyal di pesantren tidak
  selalu bagus. Absensi ditolak, atau tetap jalan dengan cara lain?
- **Berapa lama inisialisasinya?** Apakah pengguna sempat menunggu?
- **Setelah aplikasi lama di background, waktunya masih akurat?**
- **Ada laporan dari pengguna yang ternyata bukan bug?** Misalnya orang mengira
  aplikasi salah padahal jam HP-nya yang salah.

Satu paragraf tentang satu masalah nyata di sini lebih berharga daripada seluruh
penjelasan di atas — itu yang tidak bisa dibaca orang di dokumentasi TrueTime.

## GPS dan selfie: lapisan yang lain

Waktu cuma satu dari tiga hal yang diverifikasi. Aplikasinya juga merekam lokasi
GPS untuk memastikan absensi dilakukan di lokasi kerja, dan meminta selfie
sebagai bukti orangnya benar hadir.

[ISI SENDIRI] Kalau ada cerita menarik soal dua ini — GPS yang meleset di dalam
gedung, mock location, ukuran foto yang bikin upload lambat — sebutkan singkat.
Kalau tidak ada, potong bagian ini saja, jangan dipanjangkan.

## Yang saya ambil dari ini

[ISI SENDIRI] Tutup dengan kesimpulanmu sendiri, satu-dua paragraf.

Kalau butuh arah: pelajarannya bukan soal TrueTime. Yang lebih umum adalah
kebiasaan bertanya _data ini datang dari mana, dan siapa yang bisa
mengubahnya_ — pertanyaan yang berlaku untuk jam, lokasi, dan apa pun yang
dikirim klien. Tapi tulis dengan kalimatmu, bukan kalimat saya.

---

**Stack:** Kotlin, MVVM, ViewBinding, Retrofit, RxJava, Google Maps, TrueTime
**Aplikasi:** [ePesantren](https://play.google.com/store/apps/details?id=com.pesantren.pesantren_flutter) ·
[AdminSekolah](https://play.google.com/store/apps/details?id=com.ekosp.indoweb.adminsekolah)
