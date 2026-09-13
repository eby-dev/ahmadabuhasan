---
title: 'When the Platform Changes Under You'
description: 'Android 15 made edge-to-edge mandatory. Retrofitting it into an app with years of screens is not one change.'
publishedAt: 2027-06-25
draft: true
tags: ['android', 'ui', 'migration']
---

Android 15 draws apps edge-to-edge by default. Your layout extends behind the
status bar and the navigation bar, and it is your job to keep content out from
under them.

For an app designed that way, fine. For an app with years of screens built
when the system reserved that space for you, it means content sitting under
the clock and buttons behind the gesture bar — everywhere, at once, the moment
you raise the target SDK.

You cannot opt out for long. Play requires a target SDK update annually.

## Not one change, seven

I expected a base-class fix. Apply insets in `BaseActivity`, done.

What I found was that "handle insets" means different things per screen, and
the differences are real:

Most screens want padding for the status and navigation bars, nothing more.
Screens with text input want insets *without* the keyboard participating —
otherwise the padding fights the keyboard and content jumps. Screens with a
scrollable body want the bottom inset on the scroll container, not the root,
so the last item scrolls clear of the gesture bar instead of a gap sitting
below everything. Screens with a transparent status bar and a full-bleed image
want the inset on the toolbar only, or the image stops reaching the top, which
was the point.

So the shared helper is not one method:

```java
// for screens that never show a keyboard
protected void applyInsetWithoutKeyboard(View target) {
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    ViewCompat.setOnApplyWindowInsetsListener(target, (v, insets) -> {
        Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
        return insets;
    });
}
```

Plus a keyboard-aware variant, and — this is the part I did not expect — an
opt-out, because one screen had already implemented edge-to-edge manually
before the base class existed, and applying it twice gave double padding.

```java
// this screen handles its own insets; applying the base treatment doubles it
if (activity instanceof LegacyInsetActivity) return;
```

An exception list in the base class is not something to be proud of. It is
also what a real migration looks like when screens were written by different
people across several years.

## Six months, in pieces

The commits for this run from late 2025 into the middle of 2026. A base helper
first, then screens converted as they were touched for other reasons.

That pace was not a plan so much as a constraint, and it turned out to be the
right shape anyway. A single sweeping change across every screen is
unreviewable — hundreds of layout diffs, each needing a visual check on
several screen sizes, with no test that catches "this is eight pixels too high".

Doing it screen by screen meant each change was small enough to actually look
at, and mistakes stayed local. The cost is a long period where the app is
inconsistent, and knowing which screens are converted requires checking.

I went back and forth on the alternative — a big-bang conversion, one release,
everything at once. I still think it was wrong here, but the argument against
incremental is real: six months of two visual conventions in one app, and a
migration that could stall if attention moves elsewhere.

## What I took from it

**Platform deadlines are not feature work and get planned like it.** Nobody
asks for edge-to-edge. No ticket describes user value. It arrives as a
compliance date, and the work is as large as a feature — larger, because it
touches every screen rather than adding one.

**A base class can hold the common case, not every case.** I wanted one method
because the platform change sounded like one thing. Screens differ in ways that
matter to users, and forcing them through one path produces layouts that are
technically correct and visibly wrong.

**Visual regressions have no failing test.** Every other migration in this
codebase had a compiler or a test to lean on. This one had my eyes on a
handful of devices, which is a real argument for doing it in pieces small
enough to inspect.
