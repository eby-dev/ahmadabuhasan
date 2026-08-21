---
title: e-Pakon SiGanteng
category: Android Native
sector: Government
description: >-
  Government employee attendance app for Pemkab Pamekasan with TF Lite face
  recognition, CameraX, biometric auth, and root detection (Rootbeer). Featured
  in Radar Madura.
cover: ../../assets/projects/e-pakon-siganteng.png
client: Pemkab Pamekasan
contribution: Sole Android developer
press:
  outlet: Radar Madura
problem: >-
  Attendance for a regional government office had no way to prove who was
  actually present. A PIN or a shared device meant one person could clock in for
  a whole team, and a device with its clock rolled back could backdate an entry
  entirely.
approach: >-
  Face recognition runs fully on-device with TF Lite and ML Kit, so a check-in
  never depends on office connectivity and no face data leaves the phone.
  CameraX handles capture, Biometric gates the session, and Rootbeer refuses to
  run where the device has been tampered with. Room queues submissions locally
  so a dropped connection delays a check-in rather than losing it.
tech:
  - Kotlin
  - MVVM
  - Coroutines
  - CameraX
  - ML Kit
  - TF Lite
  - Room
  - Retrofit
  - Firebase
  - Biometric
  - Rootbeer
  - In-App Update
  - OneSignal
links:
  playStore: https://play.google.com/store/apps/details?id=com.natusi.bkpsdm
status: shipped
featured: true
publishedAt: 2024-03-01
order: 2
---
