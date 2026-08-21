---
title: SG Sehat
category: Flutter
sector: Healthcare
description: >-
  Hospital super-app for Cipta Nirmala Group with real-time teleconsultation
  (Zego), hospital map, service booking, educational mini-games (Flame), and
  offline caching.
cover: ../../assets/projects/sg-sehat.png
client: Cipta Nirmala Group
contribution: Flutter developer
problem: >-
  Patients had to phone or queue in person for every interaction with the
  hospital — booking a service, finding the right building, reaching a doctor
  for something that did not need a visit. Hospital buildings are also where
  mobile signal is worst, so an app that assumed connectivity would fail exactly
  where it was needed.
approach: >-
  One Flutter app covering teleconsultation, service booking, and hospital
  wayfinding. Zego UIKit carries real-time video so a consultation does not need
  a visit. Responses are cached through Hive and a Dio cache interceptor, so the
  app stays usable in a dead spot and syncs when signal returns. Flame powers
  the health-education mini-games that keep patients returning between visits.
tech:
  - Flutter
  - Dart
  - GetX
  - Dio
  - Hive
  - dio_cache_interceptor
  - Zego UIKit Prebuilt Call
  - Google Maps
  - Firebase
  - OneSignal
  - Flame
links:
  playStore: https://play.google.com/store/apps/details?id=com.cipta.nirmala
status: shipped
featured: true
publishedAt: 2024-06-01
order: 1
---
