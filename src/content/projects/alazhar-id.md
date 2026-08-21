---
title: alazhar.id
category: Flutter
sector: Education
description: >-
  Flutter payment app for Al-Azhar schools using BNI Virtual Account payments —
  handling tuition (SPP), PPDB registration, education funds, and donations (Infaq).
cover: ../../assets/projects/alazhar-id.png
client: Al-Azhar Schools
contribution: Flutter developer
problem: >-
  School payments ran on bank transfers and manual reconciliation. Parents had
  no way to see what was owed, and staff matched incoming transfers against
  student records by hand — slow during term, worse during admissions season.
approach: >-
  A Flutter app issuing BNI Virtual Account numbers per payment, so each
  transfer reconciles itself against the right student without manual matching.
  Tuition, PPDB admissions, education funds, and Infaq donations all run through
  the same flow, with OneSignal notifying parents when a bill is due or a
  payment clears.
tech:
  - Flutter
  - Dart
  - http
  - Dio
  - OneSignal
  - Google Maps Flutter
  - WebView
links:
  playStore: https://play.google.com/store/apps/details?id=com.natusi.alazhar_id
status: shipped
# Unfeatured to keep the homepage to three: the remaining featured projects
# cover three distinct sectors, and Education is already represented there.
featured: false
publishedAt: 2024-01-01
order: 3
---
