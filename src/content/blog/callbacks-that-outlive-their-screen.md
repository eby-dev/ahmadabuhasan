---
title: 'Callbacks That Outlive Their Screen'
description: 'Three crashes and one leak, all the same shape: something finished after the screen it belonged to was gone.'
publishedAt: 2027-05-18
draft: true
tags: ['android', 'lifecycle', 'java']
---

Going through a batch of crash reports, four separate issues turned out to be
the same sentence: _something completed after the screen that started it had
been destroyed._

They looked unrelated in the crash list. A permission dialog, a snackbar, a
sort action, a dismissal. Different screens, different stack traces, different
weeks. Same shape.

## The permission dialog

Requesting background location shows a system dialog explaining why. The user
reads it, taps the positive button, and the app launches the real permission
request.

Between showing the dialog and that tap is an unbounded amount of time, and
the fragment underneath can be gone by then — the user rotated the phone,
backgrounded the app, or navigated away while the dialog was up.

```java
// Fragment can be detached by the time the dialog button is tapped,
// and the launcher is null before onCreate completes.
if (isAdded() && permissionLauncher != null) {
    permissionLauncher.launch(ACCESS_BACKGROUND_LOCATION);
}
```

Two conditions because there are two ways to be wrong: detached from the
activity, and not yet ready. Any fragment that puts a human decision between
starting something and finishing it needs both.

## The snackbar that held a fragment

A notification list supports swipe-to-delete with an undo snackbar. The
callback that finalises the delete was written as an anonymous inner class
inside the swipe handler:

```java
snackbar.addCallback(new Snackbar.Callback() {
    @Override public void onDismissed(Snackbar sb, int event) {
        // implicit reference to the fragment
    }
});
```

An anonymous inner class holds a reference to whatever encloses it. The
snackbar outlives a fast navigation away, so the fragment — its views, its
adapter, its data — stays in memory until the snackbar finishes its animation.

One fragment is not much. The fix is to hold the callback as a field and
remove it explicitly:

```java
@Override
public void onDestroyView() {
    if (snackbar != null) snackbar.removeCallback(deleteCallback);
    super.onDestroyView();
}
```

What I find worth noting is that this code was not careless. Anonymous
callbacks are the idiomatic thing to write, and the leak is invisible in
review because the reference is implicit — it does not appear in the source at
all.

## The sort that ran too early

A crash on the listing screen when the sort action was tapped, with a null
view. Rare, and only from a particular navigation path.

The view was being used before it was initialised, which happens when an
action can be triggered before the screen has finished setting itself up —
a deep link, a restored state, a fast tap during a slow frame.

```java
if (!isViewInitialized()) return;
```

Unsatisfying, and correct. There is no way to make a UI action arrive only
after setup on a system where the user, the framework, and the network all
generate events independently.

## The dialog dismissed twice

A blocking dialog crashed on dismiss, because dismiss was called on a window
whose activity was already finishing — the dialog's own dismissal racing the
activity's teardown.

Same shape again: cleanup running against something already cleaned up.

## The common rule

Every one of these is a variation on:

> Between starting something and its callback, the thing that started it may
> no longer exist.

The gap can be milliseconds or minutes. It does not matter. If a callback can
run later, it has to check that its world is still there — and because
`isAdded()`, a null launcher, an uninitialised view, and a finishing activity
are each a different way of not existing, there is no single check that covers
them all.

I wish there were a tidier conclusion. The honest one is that this class of
bug is structural in a UI framework where the system can destroy your screen
at any moment, and the mitigation is a habit rather than an abstraction: every
time you write a callback, ask what the screen might be doing when it fires.

## One that is not like the others

A fifth fix from the same batch looks similar and is not. `BasePresenter` was
sending logs to Crashlytics with empty endpoints and a zero error code —
records with no information, filed because the logging path ran
unconditionally.

```java
if (logEndpoint.isEmpty() && logParams.isEmpty() && "0".equals(errorCode)) {
    return;
}
```

Nothing crashes from an empty log. What it does is fill your crash reporting
with noise, and that has a real cost: the dashboard is how you find the other
four bugs. Every empty record makes the signal harder to see, and it degrades
slowly enough that nobody notices the tool getting worse.

## What I took from it

**Group crashes by shape, not by screen.** Sorted by stack trace, these were
four unrelated tickets. Sorted by what went wrong, they were one lesson, and
fixing them together was faster than fixing them apart.

**An implicit reference is still a reference.** Anonymous inner classes and
lambdas capture their enclosing scope invisibly. The leak is in code that is
not written down anywhere, which is why it survives review.

**Guard clauses are not a design smell when the framework is the problem.**
`isAdded()`, null checks on launchers, initialisation flags — these look
defensive because they are. The alternative is pretending the platform will
not destroy your screen mid-flow, and it will.

**Protect your crash dashboard like a production system.** It is the
instrument you use to find everything else. Noise in it is not cosmetic — it
is a slow reduction in your ability to see.
