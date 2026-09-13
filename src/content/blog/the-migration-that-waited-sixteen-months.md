---
title: 'The Migration That Waited Sixteen Months'
description: 'Two screens converted, then nothing for a year and a half. What restarted it was not discipline.'
publishedAt: 2027-09-22
draft: true
tags: ['android', 'refactoring', 'migration']
---

In January 2025 I converted one screen off ButterKnife to view binding. In
February, a second one.

Then nothing, for sixteen months.

In July 2026 I did the remaining fifty-odd in about two weeks.

The interesting part is not the migration. It is the gap, because I think that
gap is the normal state of this kind of work and the two-week burst is the
anomaly.

## Why it stalled

ButterKnife binds views to fields with annotations. It was the standard
approach for years, then its author archived it and pointed everyone at view
binding, which does the same job with generated code and no annotation
processor.

So converting is obviously correct and completely optional. Nothing breaks
while you wait. The library keeps working. Every individual screen is fine.

That combination — clearly right, never urgent — is exactly the profile of
work that does not happen. There is no ticket. It competes with features for
time and loses every week, because a feature has someone asking for it and a
migration has nobody.

The two screens I did in early 2025 were done the way this work usually gets
done: I was already in that file for something else, and converted it while I
was there. That is a reasonable strategy and it does not finish. At one screen
per few months, fifty screens takes a decade, and the library becomes a real
problem long before that.

## What actually restarted it

Not discipline, and not a decision that technical debt mattered. It was a
Kotlin upgrade.

Moving to Kotlin 2.0 meant dealing with the annotation processor, and
ButterKnife's processor was one of the things in the way. Suddenly the
migration was not optional cleanup — it was on the path to something we needed.

That is the pattern, and I have stopped being cynical about it. Optional work
gets done when it stops being optional. The useful move is not to feel bad
about the sixteen months; it is to notice which upgrade will eventually force
your hand, and be ready when it does.

## Three styles in one codebase

Doing fifty screens at once surfaced something I had not seen when doing them
one at a time: ButterKnife had been used three different ways, by different
people, across several years.

Some screens used it fully — every view a `@BindView` field, click handlers as
`@OnClick` methods. Some used it for fields only, with listeners wired
manually. Some had a mix, where a later edit added a `findViewById` next to
the annotations because whoever was there did not want to think about it.

And a fourth category that only appears at scale: screens where the binding had
been commented out during some earlier attempt and never removed, so the file
had annotations that did nothing next to manual lookups that did the real work.

Each style unbinds differently, which is why "convert to view binding" is not a
mechanical find-and-replace. A mechanical pass would have produced code that
compiles and quietly loses click handlers.

This is a general property of long-lived codebases that I keep re-learning:
**a pattern applied over several years is not one pattern.** It is a
sedimentary record of how the team's conventions changed, and a migration has
to read each layer rather than assume the top one.

## Doing it in one burst

Fifty-odd screens in two weeks, one commit per screen.

Small commits felt excessive while doing it and were correct. When something
broke — and things broke, mostly click handlers that had been annotations — the
diff was one screen, and reverting cost nothing.

The other advantage only shows up in a burst: by screen fifteen I had seen
every variant, and the remaining thirty-five were fast. Spread over two years,
that knowledge never accumulates. Every screen is a fresh encounter with a
pattern you have half-forgotten.

Which is an argument I did not expect to end up making. The received wisdom is
that migrations should be incremental and opportunistic — convert files as you
touch them. I did that for sixteen months and got two screens. The burst worked
because the work is repetitive, and repetitive work rewards momentum.

## What I took from it

**"Convert it while you are in there" does not finish.** It is a good policy
and a bad plan. If the migration needs to complete, it needs dedicated time,
and the honest version of that is admitting the opportunistic approach was not
working rather than waiting another year.

**Optional work gets done when something makes it mandatory.** Watch for the
upgrade that will force it — a language version, a target SDK, an archived
dependency — and let that be the trigger rather than hoping for a quiet week.

**A convention applied over years is several conventions.** Any migration
across a mature codebase is partly archaeology, and budgeting it as a
find-and-replace is how you ship a mechanical conversion that silently drops
behaviour.
