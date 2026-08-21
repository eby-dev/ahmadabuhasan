---
title: ePesantren
category: Android Native
sector: Education
description: >-
  Employee-attendance Android app for Islamic boarding schools with GPS
  check-in, selfie verification, and TrueTime server-time validation to prevent
  device-clock manipulation.
cover: ../../assets/projects/epesantren.png
contribution: Android developer
problem: >-
  Islamic boarding schools run on a residential schedule where staff attendance
  spans early mornings and evenings across a large site. Paper logs could not
  keep up, and any digital replacement had to resist the obvious shortcut of
  signing in from somewhere else.
approach: >-
  The same verification stack as AdminSekolah, adapted to a boarding-school
  timetable: GPS check-in with selfie verification, and TrueTime server-time
  validation so a rolled-back device clock cannot backdate an entry. WhatsApp
  notifications suited a staff group that already lived there rather than in
  another app inbox.
tech:
  - Kotlin
  - MVVM
  - ViewBinding
  - Retrofit
  - RxJava
  - Google Maps
  - Firebase
  - TrueTime
links:
  playStore: https://play.google.com/store/apps/details?id=com.pesantren.pesantren_flutter
status: shipped
featured: false
publishedAt: 2023-01-01
order: 5
---
