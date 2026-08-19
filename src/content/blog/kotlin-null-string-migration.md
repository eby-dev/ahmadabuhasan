---
title: 'Ketika `null` Berubah Jadi Kata "null"'
description: 'Satu jebakan Kotlin yang muncul saat memigrasi aplikasi Android produksi dari Java — dan kenapa null-safety tidak menyelamatkanmu di batas jaringan.'
publishedAt: 2026-08-18
draft: true
tags: ['android', 'kotlin', 'migration']
---

<!--
DRAFT — dari commit di brighton-android (Nov 2024 - Agu 2026).
Semua klaim dicek ke kode: rasio file, jumlah commit, isi diff.

Baca ulang sebelum publish. Kalau ada yang tidak sesuai ingatanmu, itu yang
menang. Lalu: hapus komentar ini, ubah `draft: false`, `npm run build`.

Catatan: nama perusahaan/produk sengaja tidak disebut spesifik. Kalau kamu mau
menyebut Brighton secara terbuka, pastikan dulu itu boleh.
-->

Selama hampir dua tahun terakhir saya mengerjakan satu aplikasi Android properti
yang sudah lama jalan di produksi. Aplikasi lama — basisnya Java, arsitekturnya
MVP, dan sudah dipakai ribuan agen setiap hari.

Salah satu pekerjaan yang terus berjalan di latar belakang: memigrasi kodenya ke
Kotlin. Bukan proyek besar dengan tenggat, tapi cicilan — satu modul per beberapa
minggu, di sela-sela fitur baru.

Sampai hari ini rasionya kira-kira begini:

```
1039 file .java
1337 file .kt
```

Separuh jalan, dan masih jalan. Tulisan ini soal satu bug yang saya temukan di
tengahnya — bug yang menurut saya paling khas untuk migrasi Java→Kotlin, karena
justru muncul dari fitur Kotlin yang seharusnya melindungi kita.

## Bug-nya

Ada form untuk membuat draft listing properti. Salah satu bagiannya mengirim
lokasi: negara, provinsi, kota, area. Kodenya kira-kira begini setelah dimigrasi
ke Kotlin:

```kotlin
params[COUNTRY_ID] = presenter.selectedCountry?.id.toString()
params[PROVINCE_ID] = presenter.selectedProvince?.id.toString()
params[CITY_ID] = presenter.selectedCity?.id.toString()
```

Kelihatan aman. Ada `?.`, jadi kalau `selectedCountry` null tidak akan crash.

Dan memang tidak crash. Yang terjadi lebih halus: server menerima **string
`"null"`** — empat huruf, n-u-l-l — lalu gagal mem-parse-nya sebagai angka.

## Kenapa bisa begitu

Perhatikan di mana `?.` berhenti bekerja:

```kotlin
presenter.selectedCountry?.id.toString()
//                       ^^^          ^^^
//                       aman         TIDAK aman
```

`?.` hanya melindungi pemanggilan `.id`. Kalau `selectedCountry` null, ekspresi
`selectedCountry?.id` menghasilkan `null` — dan `.toString()` berikutnya dipanggil
**pada hasil null itu**, bukan di-skip.

Di Kotlin, `null.toString()` bukan error. Itu memanggil ekstensi
`Any?.toString()`, yang dengan patuh mengembalikan string `"null"`.

Jadi alih-alih crash yang langsung kelihatan, kita dapat data kotor yang lolos
sampai ke server.

Perbaikannya satu karakter, plus satu pemanggilan:

```kotlin
params[COUNTRY_ID] = presenter.selectedCountry?.id?.toString().orEmpty()
//                                                ^
//                                    ?. kedua, dan .orEmpty() di ujung
```

Sekarang null jadi string kosong, bukan kata "null".

## Yang bikin ini menarik

Bug seperti ini tidak akan muncul di Java.

Di Java, `selectedCountry.getId()` pada objek null langsung melempar
`NullPointerException`. Berisik, tapi jujur — kamu tahu persis ada yang salah,
dan tahu di baris mana.

Kotlin menawarkan `?.` supaya kita tidak perlu menulis pengecekan null bertingkat.
Tapi kalau operatornya dipakai setengah jalan, hasilnya bukan keamanan — hanya
kegagalan yang lebih sunyi. Crash berubah jadi data rusak, dan data rusak jauh
lebih mahal untuk ditemukan.

Saya menemukan varian bug ini belasan kali selama migrasi. Selalu bentuknya sama:
`?.` yang berhenti terlalu cepat, lalu `.toString()` menutupinya.

## Bug kedua di commit yang sama

Sambil memperbaiki itu, saya menemukan sesuatu yang lebih merepotkan:

```kotlin
// params[TITLE] = binding.tieTitle.text.toString()
// params[OTHER] = binding.tieDesc.text.toString()
```

Dua baris itu ada di fragment Lokasi. Masalahnya, Title dan Description dimiliki
oleh fragment General — di sanalah pengguna mengisinya. Kedua baris ini menimpa
nilai yang sudah benar dengan isi field lokal yang tidak pernah diisi siapa pun.

Efeknya: pengguna mengetik judul di halaman General, lalu draft-nya tersimpan
dengan judul `-`.

Ini tidak ada hubungannya dengan Kotlin. Ini soal dua bagian layar yang sama-sama
merasa berhak menulis ke field yang sama. Tapi menariknya, keduanya ketemu
bersamaan — karena begitu kamu mulai menelusuri kenapa payload berisi `"null"`,
kamu jadi benar-benar membaca apa saja yang dikirim ke server.

## Yang saya pelajari

**Null-safety bukan properti bahasa, tapi properti batas sistem.** Kotlin menjaga
apa yang terjadi di dalam kodenya. Yang keluar lewat jaringan cuma string — dan
di situ `"null"`, `""`, dan tidak-mengirim-apa-apa adalah tiga hal yang sangat
berbeda bagi server.

**Migrasi bertahap itu benar, tapi jangan mekanis.** Setiap modul yang saya
pindahkan ke Kotlin, saya baca ulang alur datanya, bukan cuma menerjemahkan
sintaksnya. Bug `"null"` di atas justru akan lolos kalau saya hanya mengubah
`getId()` jadi `?.id` dan menganggap pekerjaan selesai.

**MVP-nya tidak saya ganti.** Aplikasi ini masih punya 422 Presenter dan nol
ViewModel — arsitekturnya tetap MVP, hanya bahasanya yang berpindah. Menggabungkan
dua perubahan besar sekaligus, di aplikasi yang dipakai orang setiap hari, akan
membuat setiap bug jadi sulit dilacak: salah bahasa, atau salah arsitektur?
Satu perubahan pada satu waktu.
