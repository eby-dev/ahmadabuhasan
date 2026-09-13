---
title: 'Blocking the Wrong People'
description: 'We turned on runtime self-protection and made it close the app on detection. Two weeks later I walked one of those checks back.'
publishedAt: 2026-10-23
draft: true
tags: ['android', 'security', 'kotlin']
---

The app handles property listings, client contacts, and commission data for
agents in the field. Last year it went through a security pass: obfuscation
turned on, runtime APK signature verification, and a RASP library — runtime
application self-protection, which watches for a rooted device, a hooking
framework, known malware, a tampered binary, or an install that did not come
from a trusted store.

We started with everything on silent logging. Detections went to our crash
reporting, nobody was interrupted, and for a few weeks we just watched.

Then we turned on enforcement.

## What enforcement means

For a critical threat, the app shows a dialog that cannot be dismissed and
closes itself:

```kotlin
// no "I understand", no secondary button, no way back
SecurityWarningDialog.show(activity, type)
// ... on acknowledge:
activity.finishAffinity()
```

I removed the "I understand" option deliberately. A security block with a
"continue anyway" button is theatre — it trains users to click past the
warning, and the one time it matters they click past that too.

Root, hooking framework, and known malware all became hard blocks. So did an
untrusted installation source.

That last one is the mistake.

## The signal that means two different things

Untrusted install source means the app was not installed by the Play Store.
It fires for sideloading, which is a real attack path: pull the APK, patch it,
push it back to a device, watch what the network layer does.

It also fires for a device under enterprise management, a corporate MDM
rollout, a beta distributed outside Play, and a handful of OEM installers that
are perfectly legitimate.

The detections came in, and the pattern was not what I had assumed. These were
not attackers. They were agents whose company-managed phones installed apps
through a channel Play does not vouch for.

I had shipped a check that locks people out of their work app for doing
nothing wrong, and offers them no way forward — because I had deliberately
removed the way forward.

The walk-back was two lines:

```kotlin
override fun onUntrustedInstallationSourceDetected() {
    // Silent-logged, not blocked: fires for enterprise MDM and OEM installers
    // as often as for real sideloading. Root/Hook/Malware remain hard blocks.
    log(SecurityWarningType.UNTRUSTED_INSTALL_SOURCE)
}
```

Still detected. Still logged. No longer fatal.

I did the same for tamper detection, for a different reason: I had not yet
convinced myself the signal was clean enough to bet a user's session on. A
check you do not fully trust does not belong on the blocking path.

## The distinction I was missing

I had sorted the checks by **how bad the thing is if it is real**. Root,
hooking, malware, sideloading, tampering — every one of them describes a
device I would not want handling client data. Sorted that way, they all
deserve a hard block.

The useful question is different: **what fraction of these detections are
actually the attack, and what happens to everyone else?**

That splits the same list in two.

Root and hooking frameworks are chosen. Someone installed Magisk or Frida on
purpose. A user with a hooking framework active who is not attacking something
is rare enough to accept as collateral.

An untrusted install source is _circumstantial_. It describes how the app
arrived, which is frequently a decision made by an IT department the user has
never spoken to. The base rate of innocent detections is high, and the cost to
each of those users is total — the app will not open, and there is nothing
they can do about it.

The severity of the threat sets how much you care. The false-positive rate
sets what you are allowed to do about it. I had only been reasoning about the
first one.

## What I would do differently

**Measure before enforcing.** The silent-logging period was the right call and
I nearly wasted it. I watched for crashes and integration problems, but I did
not look hard at _who_ was being detected until enforcement made it urgent.
The data to predict this was already sitting in our dashboard.

**Log enough to tell the two cases apart.** After the walk-back I went back and
added installer package name and build context to every RASP log, so the next
time this question comes up the answer is a query rather than a guess.

**A block with no recovery path needs a signal you would bet the user's day
on.** Not their session — their day. If an agent cannot open the app, they
cannot show a property. That is the actual unit of cost, and it is the number
that should have been on the other side of the scale from the start.
