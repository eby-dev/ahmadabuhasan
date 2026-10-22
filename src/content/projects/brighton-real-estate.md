---
title: Brighton Real Estate
category: Android Native
sector: Real Estate
description: >-
  Contributed to Brighton's existing Android app through Java-to-Kotlin
  migration, ViewBinding refactoring, Android 15 support, and runtime hardening.
longDescription: >-
  Brighton Real Estate runs a nationwide property marketplace covering listings
  across Indonesia, backed by thousands of agents in dozens of cities. The
  Android app was already live and mature when I joined in November 2024 —
  built on MVP with Dagger 2, with a long tail of Java and ButterKnife still in
  place.

  I contributed to the existing production codebase rather than a greenfield
  build. My work included incremental Java → Kotlin migration, replacing
  ButterKnife with ViewBinding screen by screen, adding edge-to-edge support
  for Android 15+, migrating endpoints onto a new API gateway, and hardening
  the app with FreeRasp. I also handled production triage: reading Crashlytics,
  reproducing crashes and NPEs against real user reports, and shipping fixes
  through GitLab CI and Fastlane.
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
  Contributed to an incremental migration against the live codebase. Java was
  converted to Kotlin and ButterKnife replaced with ViewBinding screen by
  screen, so releases did not depend on the whole migration finishing.
  Edge-to-edge support was added for Android 15+, endpoints were moved onto
  the new API gateway, and FreeRasp was added for runtime hardening. I also
  handled production triage through Crashlytics and shipped fixes via GitLab
  CI and Fastlane.
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
status: shipped
featured: true
publishedAt: 2024-11-01
order: 0
---
