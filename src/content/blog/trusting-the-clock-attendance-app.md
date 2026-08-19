---
title: 'Absensi Karyawan: Jangan Percaya Apa Pun dari Perangkat'
description: 'Catatan dari lima aplikasi absensi Android di Indoweb — kenapa jam, zona waktu, dan radius lokasi semuanya diputuskan server, bukan HP pengguna.'
publishedAt: 2023-04-15
draft: true
tags: ['android', 'kotlin', 'attendance']
---

<!--
DRAFT — dibuat dari kode di C:\p\jobs4\audit (5 repo Indoweb) + CHANGELOG v1->v2.
Semua klaim teknis sudah dicek ke kode, bukan asumsi.

Isinya sudah utuh; tinggal satu catatan [OPSIONAL] di bagian zona waktu yang
boleh diisi atau dihapus. Baca ulang seluruhnya — kalau ada yang tidak sesuai
ingatanmu, itu yang menang, bukan pembacaan saya atas kodenya.

Sebelum publish: hapus komentar ini, ubah `draft: false`, jalankan `npm run build`.
-->

Selama magang di Indoweb.id saya mengerjakan lima aplikasi absensi Android
dalam rentang empat bulan: eLazis (Januari 2023), sebuah varian internal,
AdminSekolah (Februari), ePesantren (Maret), lalu AdminSekolah versi siswa
(April). Semuanya melakukan hal yang sama — karyawan absen masuk, ambil selfie,
kirim.

Mengerjakan hal yang mirip lima kali berturut-turut punya efek yang tidak saya
duga: kesalahan di aplikasi pertama jadi kelihatan waktu mengerjakan yang kedua.
Dan pola yang tersisa setelah kelimanya selesai adalah ini — **hampir semua yang
menentukan sah-tidaknya sebuah absensi diputuskan di server, bukan di HP.** Bukan
karena dirancang begitu dari awal, tapi karena satu per satu kami menemukan
alasannya.

## Jam perangkat: masalah yang jelas

Cara paling gampang mencatat absensi adalah pakai jam HP. Ambil
`System.currentTimeMillis()`, kirim ke server, simpan.

Masalahnya, jam perangkat bisa diubah siapa saja — buka Settings, matikan waktu
otomatis, geser jamnya. Tidak perlu root. Untuk aplikasi yang datanya dipakai
menghitung keterlambatan, itu melubangi seluruh gunanya.

Solusi kami: **jangan pernah kirim waktu dari klien.** Endpoint absensinya tidak
punya parameter waktu sama sekali:

```kotlin
@Multipart
@POST("absen.php")
suspend fun presence(
    @Header("Authorization") token: String,
    @Part("id_pegawai") userId: RequestBody,
    @Part("type") type: RequestBody,
    @Part("lokasi") location: RequestBody,
    @Part("lati") latitude: RequestBody,
    @Part("longi") longitude: RequestBody,
    @Part("keterangan") noted: RequestBody,
    @Part image: MultipartBody.Part
): DefaultResponse
```

Tidak ada `waktu`, tidak ada `timestamp`. Server yang stempel waktu saat request
masuk. Klien tidak punya cara mengarang jam absen, karena tidak diberi
kesempatan mengirimkannya.

Ini keputusan yang murah dan menutup celahnya sepenuhnya. Kalau saya
mengerjakan aplikasi absensi lagi, ini hal pertama yang saya pastikan.

## NTP sebagai gerbang, bukan sebagai jam

Di v2 kami menambahkan [TrueTime](https://github.com/instacart/truetime-android),
library yang mengambil waktu dari server NTP lalu mengukurnya terhadap
`SystemClock.elapsedRealtime()` — penghitung sejak booting yang tidak bisa diubah
dari Settings. CHANGELOG v2.0.0 mencatatnya sebagai "Menambahkan Server NTP untuk
mendapatkan waktu sekarang".

```kotlin
TrueTimeRx.build()
    .withConnectionTimeout(31428)
    .withRetryCount(100)
    .withSharedPreferencesCache(this)
    .initializeRx("1.id.pool.ntp.org")
```

Karena waktu absensi sudah distempel server, TrueTime tidak dipakai sebagai
sumber jam. Perannya jadi lain: **gerbang** — kalau waktu tepercaya belum
tersedia, aplikasi tidak boleh jalan. Setiap `MainActivity` mengeceknya lebih
dulu, dan `TrueTimeRx.now()` dibandingkan dengan `Date()` supaya selisih
perangkat terlihat di log.

Gerbang itu di aplikasi pertama salah pasang. Di eLazis, Januari 2023:

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    // ...
    if (!TrueTimeRx.isInitialized()) {
        Toast.makeText(this, "Sorry TrueTime not yet initialized.", Toast.LENGTH_SHORT).show()
        return   // <- keluar sebelum getBottomNavigation()
    }

    session = SessionManager(this)
    // ...
    getBottomNavigation()
}
```

`return` itu keluar dari `onCreate` sebelum navigasi bawah dipasang. Jadi kalau
inisialisasi NTP belum selesai saat halaman utama dibuka, pengguna dapat Toast
sekejap — lalu layar tanpa menu, tanpa jalan ke mana pun. Bukan pesan error yang
bisa dimengerti, cuma aplikasi yang seperti rusak.

Dan itu bukan skenario teoretis. Lihat konfigurasinya: `withRetryCount(100)`
dengan timeout ~31 detik per percobaan. Angka itu saya set tinggi justru karena
NTP tidak selalu langsung berhasil di jaringan sekolah dan pesantren. Artinya
kondisi "belum siap" memang dirancang untuk mungkin terjadi — tapi
penanganannya di layar tidak ikut dirancang.

Yang menarik, dan baru saya lihat waktu membaca ulang riwayat git-nya: gerbang
yang sama di empat aplikasi setelahnya tidak pernah pakai Toast lagi. Semuanya
turun jadi log:

```kotlin
// AdminSekolah (Feb), ePesantren (Mar), dan dua lainnya
if (!TrueTimeRx.isInitialized()) {
    Log.d(TAG, "Sorry TrueTime not yet initialized.")
    return
}
```

Saya tidak ingat pernah memutuskan itu, dan tidak ada commit yang menjelaskannya
— tapi urutan tanggalnya jelas. Kemungkinan besar saya melihat gejalanya di
eLazis, lalu di aplikasi berikutnya menulisnya berbeda tanpa pernah kembali
memperbaiki yang pertama.

Itu pun belum benar. `return`-nya masih ada, jadi apa pun yang ada di bawahnya
tetap terlewat; yang hilang cuma Toast yang membuat pengguna merasa aplikasinya
rusak. Yang seharusnya: tampilkan status loading, atau biarkan aplikasi jalan dan
tunda pengecekan sampai tombol absen ditekan.

Pelajarannya bukan soal NTP. Kalau kamu memasang gerbang untuk kondisi yang
kadang gagal — dan `withRetryCount(100)` itu pengakuan bahwa kondisinya sering
gagal — maka **jalur gagalnya butuh desain yang sama seriusnya dengan jalur
berhasil.** Yang saya lakukan cuma memelankan gejalanya.

## Zona waktu: masalah yang tidak saya duga

Ini yang paling berkesan, dan tidak akan ketemu kalau aplikasinya cuma dipakai
di satu kota.

Indonesia punya tiga zona waktu: WIB, WITA, WIT. Aplikasinya dipakai sekolah dan
pesantren dari berbagai daerah. Dan zona waktu HP itu — sama seperti jamnya —
milik pengguna. Guru yang pindah dari Jakarta ke Papua, atau yang HP-nya tidak
pernah diatur ulang, akan melihat jam yang salah untuk sekolahnya.

Solusinya sama seperti masalah jam: **jangan tanya perangkat, tanya server.**
Zona waktu datang dari response login (`login.gmt`), lalu dipasang eksplisit:

```kotlin
when (login.gmt) {
    "WIB" -> TimeZone.setDefault(TimeZone.getTimeZone("Asia/Jakarta"))
    "WITA" -> TimeZone.setDefault(TimeZone.getTimeZone("Asia/Makassar"))
    "WIT" -> TimeZone.setDefault(TimeZone.getTimeZone("Asia/Jayapura"))
}
```

Sekolahnya yang menentukan zona waktunya, bukan HP gurunya.

Satu hal yang saya temukan waktu menyiapkan tulisan ini, dan lebih baik saya
tulis daripada saya diamkan. Ada commit di ePesantren, 5 April 2023, judulnya
satu kata: `gmt`. Isinya satu baris:

```diff
- val token = sharedPref.getString("token", null).toString()
+ val token = sharedPref.getString("indonesia_time", null).toString()
```

Variabelnya bernama `token`, dibaca dari SharedPreferences, lalu di-`println`.
Kunci `indonesia_time` itu tidak pernah ditulis di mana pun, jadi nilainya selalu
`"null"`. Untungnya nilai itu juga tidak dipakai untuk apa-apa — autentikasi
sebenarnya lewat `@Header("Authorization")` per request, bukan dari sini. Jadi
efeknya nol.

Tapi bacanya tetap tidak enak: sebaris kode debug yang tertinggal di jalur
pembuatan API client, dengan nama variabel yang menyesatkan siapa pun yang
membacanya nanti — termasuk saya, tiga tahun kemudian, yang sempat mengira ini
bug autentikasi sebelum menelusuri ke mana nilainya pergi.

<!--
[OPSIONAL] Kalau kamu ingat ada sekolah yang benar-benar melaporkan jam absensi
melenceng, satu kalimat soal itu bikin bagian ini jauh lebih hidup. Kalau tidak
ingat, biarkan saja — bagian ini sudah utuh tanpa itu.
-->

## Radius dan area juga dari server

Setelah dua kejadian di atas, polanya jadi kebiasaan. Konfigurasi geofence pun
tidak di-hardcode di aplikasi:

```kotlin
validation = dataUser.validation
radius = dataUser.radius
listArea.addAll(dataUser.area)
```

Radius, daftar lokasi yang sah, dan mode validasi semuanya ikut response
`data_user.php`. Efek sampingnya yang berguna: sekolah bisa menambah lokasi baru
atau melonggarkan radius tanpa update aplikasi. CHANGELOG v1 mencatat "Maps satu
lokasi", v2 jadi "Maps banyak lokasi" — perubahan itu tidak butuh rilis baru di
sisi klien.

## Yang berubah dari v1 ke v2

Membaca CHANGELOG-nya sekarang, hampir semua perubahan besar di v2 punya bentuk
yang sama — memindahkan keputusan dari klien ke server, atau menutup celah yang
muncul karena klien terlalu dipercaya:

- Selfie dari _optional_ jadi _required_
- Batas waktu absen 20 detik → 60 detik
- Data real-time: admin LOCK/UNLOCK langsung berlaku tanpa user logout
- Keterangan izin dari _optional_ jadi _required_
- **Presensi hanya bisa satu kali**

Yang terakhir itu menutup celah yang paling gampang dipakai. Absensi punya dua
jenis — datang dan pulang — dan tipenya dikirim sebagai parameter biasa:

```kotlin
@Part("type") type: RequestBody
```

Di v1, tidak ada yang mencegah seseorang mengirim absen datang dua kali, atau
absen lalu mengajukan izin untuk hari yang sama. Klien memang tidak menampilkan
tombolnya lagi, tapi klien bukan tempat aturan ditegakkan — tombol yang
disembunyikan hanya menyulitkan orang yang tidak berniat curang.

Di v2 aturannya pindah ke server: sudah absen berarti tidak bisa absen lagi, dan
tidak bisa izin. Klien tetap menyembunyikan tombolnya untuk kenyamanan, tapi
keputusannya bukan lagi miliknya.

Pola yang sama dengan jam dan zona waktu — **yang menegakkan aturan tidak boleh
pihak yang diuntungkan kalau aturannya dilanggar.**

## Yang saya ambil dari ini

Pelajarannya bukan soal TrueTime, dan bukan soal absensi.

Yang tersisa di kepala saya adalah satu kebiasaan bertanya: **data ini datang
dari mana, dan siapa yang bisa mengubahnya?** Jam, zona waktu, lokasi, radius,
boleh-tidaknya absen dua kali — semuanya awalnya terasa seperti "urusan
perangkat". Ternyata semuanya urusan server, dan yang membedakan cuma seberapa
cepat kami menyadarinya.

Kalau data dipakai untuk mengambil keputusan yang berdampak ke orang — kehadiran,
keterlambatan, dan pada akhirnya gaji — maka yang mengirim data tidak boleh jadi
pihak yang berkepentingan atas hasilnya.

Dan satu catatan untuk diri saya sendiri, dari bug eLazis di atas: memindahkan
kepercayaan ke server itu setengah pekerjaan. Setengah lainnya adalah memikirkan
apa yang dilihat pengguna ketika lapisan yang kamu percayai itu sedang tidak
tersedia.

---

**Stack:** Kotlin, MVVM, ViewBinding, Retrofit, RxJava, Google Maps, TrueTime
**Aplikasi:** [ePesantren](https://play.google.com/store/apps/details?id=com.pesantren.pesantren_flutter) ·
[AdminSekolah](https://play.google.com/store/apps/details?id=com.ekosp.indoweb.adminsekolah)
