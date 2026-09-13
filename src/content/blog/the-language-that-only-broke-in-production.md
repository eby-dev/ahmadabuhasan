---
title: 'The Language That Only Broke in Production'
description: 'The language switcher worked on every device I tested. It broke for everyone who installed the app from the Play Store — and the cause was not in the code.'
publishedAt: 2026-09-18
draft: true
tags: ['android', 'localization', 'play-store']
---

The app I work on ships in two languages, Indonesian and English, with a
switcher in the settings screen. It had worked for years.

Then the reports came in: the switcher did nothing. Pick English, the screen
reloads, everything is still in Indonesian.

I could not reproduce it. Not on my device, not on the test devices, not on
any emulator image I tried. Debug builds switched languages perfectly every
time.

The difference turned out to be how the app got onto the phone.

## What Android App Bundle does to your resources

When you upload an App Bundle, Google Play does not hand users your whole app.
It generates a slimmed-down APK per device — only the screen densities that
device needs, only its CPU architecture, and **only the languages configured
in its system settings**.

That last one is the default. It is on unless you turn it off.

So for a user whose phone is set to Indonesian, Play strips the English
strings out of the APK before it ever reaches them. The switcher still runs,
still sets the locale, still recreates the activity. Android then looks for
English resources, finds none, and falls back to the only language present.

Nothing fails. There is no crash, no error, no missing-resource exception.
The feature just quietly does nothing, and only for people who installed the
app the normal way.

Debug builds install the full APK, every language included. That is the whole
reason it worked on my desk.

The fix is four lines of Gradle:

```gradle
bundle {
    language {
        enableSplit = false
    }
}
```

This tells Play to keep every language in every APK. You pay for it in
download size. If your app has an in-app language switcher, you have already
decided that trade — the system language is not the only one your users want.

## The second bug, hiding behind the first

With splitting disabled, switching started working — except on a fresh
install, where the app opened in English for users who should have had
Indonesian.

The default locale was hardcoded:

```java
return "id_ID";
```

Which looks right. `id` is the ISO 639-1 code for Indonesian, and `id_ID` is
how you would write it almost anywhere else.

Android does not use `id`. It uses `in`.

The reason is a decades-old piece of baggage. ISO renamed three language codes
in 1989 — Indonesian went from `in` to `id`, Hebrew from `iw` to `he`,
Yiddish from `ji` to `yi`. Java had already shipped with the old codes, and
`Locale` chose compatibility over correctness. It still maps `id` back to
`in` on construction. Android inherited that decision and kept it.

So the resource folder is `values-in/`, and a lookup for `id_ID` matches
nothing. The fix is one word:

```java
return "in";
```

Two bugs, stacked. The second one was invisible until the first was fixed,
because when no language could switch at all, nobody noticed the default was
wrong.

## What I took from it

**The artifact you test is not the artifact your users receive.** I had been
treating "install the app and try it" as the final check. But between my
build and a user's phone, Play rewrites the package — dropping resources,
splitting binaries, re-signing. Anything that happens in that gap is invisible
to every test I run locally, and it only shows up in the one environment I
cannot debug.

I now treat the internal testing track as part of the actual test pass, not a
formality before release. It is the cheapest way to see what Play actually
produces.

**A feature that silently does nothing is worse than one that crashes.** A
crash gets a stack trace, a Crashlytics entry, a line number. This bug
produced none of that. It surfaced as user reports weeks later, and the whole
investigation started from "it works fine here" — the least useful sentence in
software.

**When a platform value looks wrong, check whether it is old before assuming
it is a typo.** `"in"` reads like a mistake. It is a thirty-five-year-old
compatibility decision that outlived the standard it was breaking with, and it
is still correct today.
