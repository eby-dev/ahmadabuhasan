---
title: Brighton Real Estate
category: Android Native
sector: Real Estate
description: >-
  Production property platform for Brighton Real Estate. I contribute to the
  live Android app — Java → Kotlin migration, ViewBinding refactor, Android 15
  edge-to-edge support, and RASP hardening.
longDescription: >-
  Brighton Real Estate runs a nationwide property marketplace covering listings
  across Indonesia, backed by thousands of agents in dozens of cities. The
  Android app was already live and mature when I joined in November 2024 —
  built on MVP with Dagger 2, with a long tail of Java and ButterKnife still in
  place.

  My work is on the existing production codebase rather than a greenfield
  build. Incremental Java → Kotlin migration, replacing ButterKnife with
  ViewBinding screen by screen, adding edge-to-edge support for Android 15+,
  migrating endpoints onto a new API gateway, and hardening the app with
  FreeRasp. A steady share of the work is production triage: reading
  Crashlytics, reproducing crashes and NPEs against real user reports, and
  shipping the fix through GitLab CI and Fastlane.
cover: ../../assets/projects/brighton-real-estate.png
# Generated stand-in, not a real screenshot — the Play Store artwork belongs to
# the client. Rendered from theme tokens so it works in both themes.
placeholderCover: true
client: Brighton Real Estate
contribution: Android developer (team)
problem: >-
  A property app that has been live and growing for years accumulates weight:
  Java screens written before Kotlin, ButterKnife bindings the ecosystem has
  moved on from, endpoints pointing at an older gateway, and crash reports that
  arrive faster than they can be triaged. Rewriting is not an option when the
  app is in daily use.
approach: >-
  Migration in place, screen by screen, against a live codebase. Java converted
  to Kotlin and ButterKnife replaced with ViewBinding incrementally, so no
  release depends on the whole migration finishing. Edge-to-edge support added
  for Android 15+, endpoints moved onto the new API gateway, and FreeRasp
  brought in for runtime hardening. Ongoing production triage through
  Crashlytics, shipped via GitLab CI and Fastlane.
tech:
  - Kotlin
  - Java
  - MVP
  - Dagger 2
  - Coroutines
  - Flow
  - RxJava
  - Retrofit
  - OkHttp
  - Room
  - GreenDAO
  - Firebase
  - Crashlytics
  - Google Maps
  - FreeRasp
  - Fastlane
  - GitLab CI
links:
  playStore: https://play.google.com/store/apps/details?id=com.brightoncorporation
  website: https://www.brighton.co.id
status: in-progress
featured: true
publishedAt: 2024-11-01
order: 0
---
