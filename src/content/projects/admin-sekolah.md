---
title: AdminSekolah
category: Android Native
sector: Education
description: >-
  Employee-attendance Android app for schools — GPS check-in, selfie
  verification, and TrueTime server-time validation to prevent device-clock
  manipulation.
cover: ../../assets/projects/admin-sekolah.png
contribution: Android developer
problem: >-
  Schools tracking staff attendance on paper had no way to confirm someone was
  on site when they signed in. Sign-in sheets can be filled in later, and a
  phone-based replacement is only as trustworthy as the device clock behind it.
approach: >-
  Check-in requires GPS position and a selfie together, so presence is tied to
  both a place and a person. TrueTime validates against server time rather than
  the handset, which closes the clock-manipulation gap that makes a naive
  attendance app worthless. Retrofit and RxJava handle the sync layer.
tech:
  - Kotlin
  - ViewBinding
  - Retrofit
  - RxJava
  - OkHttp
  - Google Maps
  - Firebase
  - TrueTime
links:
  playStore: https://play.google.com/store/apps/details?id=com.ekosp.indoweb.adminsekolah
status: shipped
featured: false
publishedAt: 2023-02-01
order: 4
---
