---
title: 'Ketika `null` Berubah Jadi Kata "null"'
description: 'Satu jebakan Kotlin yang muncul saat memigrasi aplikasi Android lama dari Java — dan kenapa null-safety tidak menyelamatkanmu di batas jaringan.'
publishedAt: 2026-08-18
draft: true
tags: ['android', 'kotlin', 'migration']
---

<!--
DRAFT — contoh kode di sini sengaja dibuat generik (User/Profile), bukan kode
klien. Pengalamannya nyata, kodenya ilustrasi.

Sebelum publish: hapus komentar ini, ubah `draft: false`, `npm run build`.
-->

Hampir dua tahun terakhir saya mengerjakan satu aplikasi Android yang sudah lama
jalan di produksi — basisnya Java, arsitekturnya MVP, dipakai ribuan orang setiap
hari.

Salah satu pekerjaan yang terus berjalan di latar belakang: memigrasi kodenya ke
Kotlin. Bukan proyek besar dengan tenggat, tapi cicilan — satu modul per beberapa
minggu, di sela-sela fitur baru. Sampai sekarang masih separuh jalan, dan masih
jalan.

Tulisan ini soal satu jenis bug yang berulang saya temui di tengahnya. Menurut
saya ini bug paling khas untuk migrasi Java→Kotlin, karena justru muncul dari
fitur Kotlin yang seharusnya melindungi kita.

## Bentuk bug-nya

Bayangkan sebuah form yang mengirim data profil ke server. Setelah dimigrasi ke
Kotlin, kodenya kira-kira seperti ini:

```kotlin
params["city_id"] = user.selectedCity?.id.toString()
params["region_id"] = user.selectedRegion?.id.toString()
```

Kelihatan aman. Ada `?.`, jadi kalau `selectedCity` belum dipilih tidak akan
crash.

Dan memang tidak crash. Yang terjadi lebih halus: server menerima **string
`"null"`** — empat huruf, n-u-l-l — lalu gagal mem-parse-nya sebagai angka.

## Kenapa bisa begitu

Perhatikan di mana `?.` berhenti bekerja:

```kotlin
user.selectedCity?.id.toString()
//               ^^^          ^^^
//               aman         TIDAK aman
```

`?.` hanya melindungi pemanggilan `.id`. Kalau `selectedCity` null, ekspresi
`selectedCity?.id` menghasilkan `null` — dan `.toString()` berikutnya dipanggil
**pada hasil null itu**, bukan di-skip.

Di Kotlin, `null.toString()` bukan error. Itu memanggil ekstensi
`Any?.toString()`, yang dengan patuh mengembalikan string `"null"`.

Jadi alih-alih crash yang langsung kelihatan, kita dapat data kotor yang lolos
sampai ke server.

Perbaikannya satu operator, plus satu pemanggilan:

```kotlin
params["city_id"] = user.selectedCity?.id?.toString().orEmpty()
//                                       ^
//                            ?. kedua, dan .orEmpty() di ujung
```

Sekarang null jadi string kosong, bukan kata "null".

## Kenapa ini menarik

Bug seperti ini tidak akan muncul di Java.

Di Java, `user.getSelectedCity().getId()` pada objek null langsung melempar
`NullPointerException`. Berisik, tapi jujur — kamu tahu persis ada yang salah, dan
tahu di baris mana.

Kotlin menawarkan `?.` supaya kita tidak perlu menulis pengecekan null bertingkat.
Tapi kalau operatornya dipakai setengah jalan, hasilnya bukan keamanan — hanya
kegagalan yang lebih sunyi. Crash berubah jadi data rusak, dan data rusak jauh
lebih mahal untuk ditemukan.

Yang paling merepotkan: bug ini tidak muncul di jalur normal. Selama pengguna
mengisi semua field, semuanya baik-baik saja. Baru terlihat ketika ada field
opsional yang dilewati — dan itu justru kasus yang paling jarang dites.

## Dua hal yang saya bawa dari migrasi ini

**Null-safety itu properti batas sistem, bukan properti bahasa.** Kotlin menjaga
apa yang terjadi di dalam kodenya. Yang keluar lewat jaringan cuma string — dan di
situ `"null"`, `""`, dan tidak-mengirim-apa-apa adalah tiga hal yang sangat
berbeda bagi server. Compiler tidak bisa menolongmu di perbatasan itu.

**Migrasi bertahap itu benar, tapi jangan mekanis.** Setiap modul yang saya
pindahkan, saya baca ulang alur datanya, bukan cuma menerjemahkan sintaksnya. Bug
di atas justru lolos kalau saya hanya mengubah `getId()` jadi `?.id` lalu
menganggap pekerjaan selesai.

Dan satu keputusan yang saya syukuri: **arsitekturnya tidak saya ganti.** MVP
tetap MVP, hanya bahasanya yang berpindah. Menggabungkan dua perubahan besar
sekaligus di aplikasi yang dipakai orang setiap hari akan membuat setiap bug sulit
dilacak — salah bahasa, atau salah arsitektur? Satu perubahan pada satu waktu.
