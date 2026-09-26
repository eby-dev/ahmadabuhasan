---
title: 'How Accurate Is Accurate Enough?'
description: 'An attendance feature has to know where you are. Picking the number that decides "close enough" took three attempts and a lesson about who owns the rule.'
publishedAt: 2026-09-25
draft: true
tags: ['android', 'kotlin', 'location']
---

An internal staff app records attendance by scanning a code at the office.
Scanning alone is not enough — you could photograph the code and scan it from
home — so it also captures your location and checks you are actually there.

Which means the app has to answer a question with a number: **how accurate
does a GPS fix have to be before we trust it?**

Android gives you `location.accuracy`, a radius in metres. A fix with accuracy
of 20 means the device believes you are within 20 metres of the reported
point. Reject fixes above some threshold and you have your gate.

Picking that threshold took three tries.

## 50, then 100, then 75

The spec said 50 metres. Reasonable on paper, and wrong in the building.

Staff scan from inside offices, often on the far side from a window. Indoors,
GPS falls back to wifi and cell triangulation, and accuracy routinely lands
between 30 and 80 metres. A 50-metre gate meant people standing at the right
desk being told their location was not accurate enough — with nothing they
could do about it except walk outside.

So it went to 100 metres, matching the threshold the server already used.

That fixed the false rejections and introduced a worse problem. At 100 metres
the client accepted fixes the server would also accept, which sounds correct
and is not: it left no margin. Any drift, any rounding difference, any
disagreement between what the device measured and what the server received,
and a scan the app had already accepted would be rejected after submission —
after the user had done everything right.

The third number, 75, is the one that stayed. The comment I left explains why:

```kotlin
// 50m from the spec is too strict for indoor conditions in the field;
// 75m is the compromise — still tighter than the server's 100m backstop,
// so the client stays stricter than the server.
const val MAX_LOCATION_ACCURACY = 75.0f
```

That last clause is the actual rule, and it took three attempts to articulate:
**the client's gate should be stricter than the server's, never equal to it.**

The client's job is to stop a request that will obviously fail, before the
user commits to it. The server's job is to be the authority. If the two agree
exactly, the client is not filtering anything — it is just guessing at the
server's answer, and any disagreement surfaces as a rejection the user cannot
understand.

## The setting that quietly breaks it

While tuning the threshold I found a second problem that no amount of tuning
would fix.

Since Android 12, the permission dialog offers two options: precise and
approximate. Approximate is deliberately coarse — it reports your location
rounded to an area of roughly 3 square kilometres, and it updates
infrequently.

A user who picks "Approximate" grants the location permission. `hasPermission`
returns true. Everything looks fine. And every fix that arrives is far too
coarse to verify anyone is at a specific building.

From the app's side this is indistinguishable from bad reception — the
accuracy value is simply large, forever, no matter where the user stands or
how long they wait.

So the check has to be explicit:

```kotlin
if (!hasPreciseLocationPermission()) {
    showApproximateLocationDialog()   // explain, then send them to settings
    return
}
```

A dialog that explains why precise location is needed and offers to open
settings. Not a generic "location unavailable" message, which would be a lie —
location is available, it is just the wrong kind.

**A granted permission is not the same as a usable permission.** That
distinction did not exist before Android 12, and code written before it
assumes it away.

## Fresh, not cached

One more, smaller: the location client caches fixes and will happily hand you
one from several minutes ago.

Normally that is a feature — it saves a cold GPS start. For attendance it is a
hole. A cached fix from when you were near the office, returned while you are
somewhere else, is exactly the scenario the check exists to prevent.

```kotlin
// attendance needs a fix from now, not one from the last time we asked
.setMaxUpdateAgeMillis(0)
```

Which costs a few seconds of waiting. The fix was to make the wait visible — a
dialog while the location resolves — rather than to accept a stale value.

## What I took from it

**A threshold is a product decision wearing a number.** 50, 100, and 75 are
not degrees of correctness. Each encodes a different answer to "who do we
inconvenience — the person standing in the right place with a weak signal, or
the person trying to cheat?" That question is not answerable from inside the
code, and the first two attempts failed because I treated it as if it were.

**Client validation should be strictly tighter than server validation.** Equal
thresholds give you the cost of two checks and the benefit of one. Anything
the client accepts, the server should accept too — otherwise the user pays for
your disagreement.

**Permission models get more granular over time, and old code assumes the old
model.** "Has the user granted location?" was a yes-or-no question for a
decade. It is not any more, and nothing warns you that your yes-or-no check
now has a third answer hiding inside the yes.
