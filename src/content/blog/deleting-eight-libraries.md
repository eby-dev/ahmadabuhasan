---
title: 'Deleting Eight Libraries'
description: 'A 3D rendering engine shipped in our property app for years. Nothing used it. Here is what removing it and seven others actually involved.'
publishedAt: 2026-12-03
draft: true
tags: ['android', 'dependencies', 'refactoring']
---

Somewhere in the dependency list of the app I work on was a full 3D rendering
engine.

Not a graphics helper. An OpenGL scene-graph engine, the kind you would use to
render a rotating model of a building. Every user had been downloading it for
years. Nothing called it. Whatever feature it was added for either never
shipped or was removed without anyone touching the dependency block.

It was not alone. Over a few weeks I removed eight libraries: the 3D engine, a
floating-hearts animation view, a signature pad, a photo zoom view, a token
autocomplete field, a process restarter, a date-time library, and a view
binding framework. Plus one image loader replaced with another.

## Four reasons a dependency stops earning its place

Sorting them afterwards, the reasons were not the same, and the difference
matters.

**Nothing uses it.** The 3D engine, the signature pad, the photo zoom view,
the process restarter. These are pure subtraction — delete two lines from the
version catalog and the build file, confirm the build is clean, done. The only
work is finding them, and the only reason they survive is that nobody thinks
to look.

**The platform absorbed it.** Joda-Time existed because `java.util.Date` was
bad enough to be worth a dependency. `java.time` arrived, and with desugaring
it works on old versions of Android too. Same job, now in the standard
library.

**The library stopped being maintained.** ButterKnife was the standard way to
bind views for years, and its author archived it and pointed people at view
binding. An unmaintained dependency is not broken on the day it is archived.
It breaks on some later day, when a Gradle upgrade or a compiler change needs
a fix that is never coming — usually while you are trying to ship something
else.

**It was never worth a dependency.** The floating-hearts library animated
images drifting up the screen for a like gesture. One screen used it. I
replaced it with a custom view of about forty lines.

That last one is the one I would push back on hardest if I were reviewing my
own younger work. A dependency for a forty-line animation costs a transitive
tree, a download, an unfamiliar API, and a maintainer whose plans you do not
control. Forty lines of your own code cost forty lines.

## The one that was real work

The other seven were removals. ButterKnife was a migration: 59 commits,
spread over a couple of weeks, converting screen by screen.

The mechanical part is easy — `@BindView` becomes a binding reference, and
Android Studio does most of it. What made it slow is that ButterKnife had been
in the codebase long enough to appear in three different styles, applied by
different people over several years, and each one unbound differently.

I did it in small commits per screen, which felt excessive at the time and was
the right call. When something broke, the diff was one screen.

Picasso to Glide was the same shape and I was less careful in one spot. Picasso
and Glide differ on scaling defaults, so the redundant `.fit()` calls had to
be dropped rather than translated — `.centerCrop()` in Glide already does what
the pair did in Picasso. A mechanical find-and-replace would have shipped
subtly wrong image sizing across a dozen adapters.

## What I actually got

I want to be honest about the payoff, because "we removed eight dependencies"
sounds better than the numbers usually justify.

The APK got smaller, mostly from the 3D engine. Nobody would have noticed on
its own.

The real return is the class of problem that stops happening. Every dependency
is a thing that can block a Gradle upgrade, conflict with another library's
transitive version, break on a new compile SDK, or need a ProGuard rule that
somebody has to work out under time pressure. Removing one does not make today
better. It removes a future bad day whose date you do not know.

The other return is comprehension. A dependency list that only contains things
you actually use is a list a new developer can read. One with a 3D engine in
it teaches them that the list is not to be trusted, and that lesson is
expensive.

## What I took from it

**Dependency lists only grow unless someone makes them shrink.** Adding is
part of a feature and gets reviewed. Removing is nobody's task and appears on
no roadmap. If it is not deliberate, it does not happen.

**"Is this maintained?" belongs in the decision to add, not just to remove.**
Every library I pulled out was a reasonable choice when it went in. The
question is not whether it works today — it is whether someone will fix it
when the platform moves, and whether you can live with the answer being no.

**Removal is the cheapest refactoring there is.** No new abstraction, no
behaviour change, and the compiler verifies most of it. It is the one cleanup
that is genuinely hard to get wrong, which makes it a strange thing for us to
do so rarely.
