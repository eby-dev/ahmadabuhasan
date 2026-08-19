---
# Required fields.
title: 'Judul tulisan di sini'
# Max 160 characters — used for <meta description> and the blog listing.
description: 'Ringkasan satu-dua kalimat. Ini yang tampil di Google dan di daftar blog.'
publishedAt: 2026-08-19

# `draft` defaults to TRUE. It must be explicitly false or the post stays
# invisible — no page built, no sitemap entry, and /blog stays noindexed.
# Kept true here on purpose: this file is a structure reference, not a post.
draft: true

# Optional fields — delete any you don't need.
tags: ['android', 'kotlin']
# updatedAt: 2026-08-20
# cover: ./images/cover.png
---

Paragraf pembuka. Ini muncul persis di bawah judul dan tanggal.

Filename menentukan URL: `example-post.md` → `/blog/example-post/`. Pakai huruf
kecil dan tanda hubung.

## Sub-judul pakai H2

Jangan pakai H1 di body — judul dari frontmatter sudah jadi H1 halaman ini.
Dua H1 dalam satu halaman itu masalah untuk SEO dan screen reader.

Teks bisa **tebal**, _miring_, `inline code`, dan [tautan](https://ahmadabuhasan.com).

```kotlin
// Blok kode sudah distyle di [slug].astro
fun main() {
    println("Hello")
}
```

### H3 kalau perlu tingkat ketiga

- Daftar berpoin
- Poin kedua

1. Daftar bernomor
2. Poin kedua

> Blockquote untuk kutipan.

## Setelah file ini jadi tulisan asli

Ganti seluruh isinya, lalu:

1. Ganti nama file jadi slug yang kamu mau (itu jadi URL-nya).
2. `npm run build` — `astro check` akan menolak kalau ada field yang salah.
3. Commit dan push. Cloudflare Pages deploy otomatis.
4. Di Search Console, minta indexing untuk `/blog` dan URL post barunya.

Begitu file ini ada dengan `draft: false`, `/blog` berhenti `noindex` sendiri
dan `/rss.xml` mulai punya isi. Tidak ada kode yang perlu diubah.
