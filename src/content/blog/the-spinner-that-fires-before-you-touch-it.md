---
title: 'The Spinner That Fires Before You Touch It'
description: 'Three redundant network calls on every visit to one screen, all from listeners nobody had triggered.'
publishedAt: 2027-03-20
draft: true
tags: ['android', 'java', 'performance']
---

A contact list screen has two dropdowns — filter by label, and sort. Open the
screen and it loads the list. Then loads it again. Then, on some paths, a
third time.

Nobody had touched either dropdown.

## Selection events you did not cause

Android's `Spinner` calls `onItemSelected` when you attach an adapter. Not
when the user picks something — when the adapter is set, position 0, during
layout. From the listener's side it is indistinguishable from a real
selection, and the listener did the reasonable thing:

```java
filterSpinner.setOnItemSelectedListener(new OnItemSelectedListener() {
    @Override
    public void onItemSelected(AdapterView<?> parent, View v, int pos, long id) {
        selectedFilter = filters.get(pos);
        reloadList();   // network call
    }
});
```

Two spinners, both set up during view creation, both firing. Plus the screen's
own initial load. Three fetches of the same data, one of which the user
actually asked for.

This is the kind of bug that never gets reported. Nothing is visibly broken —
the list shows up, the data is right. It costs battery, mobile data, and
server capacity, and on a slow connection it can produce a visible flicker as
responses land out of order, but nobody files a ticket saying "this screen
feels a bit worse than the others".

## The fix people usually reach for

The original workaround was to detach the listener, set the adapter, then
reattach it:

```java
spinner.setOnItemSelectedListener(null);
spinner.setAdapter(adapter);
spinner.setSelection(current);
spinner.post(() -> spinner.setOnItemSelectedListener(listener));
```

It works, mostly. The `post` is there because reattaching immediately still
catches the pending event, so you wait a frame — which is a guess about
framework timing, and the kind of thing that quietly stops working after a
support library upgrade.

It also has to be repeated at every call site, and missed exactly once to
bring the bug back.

## Filtering by intent instead

The better question is not *when* the listener is attached but *whether this
selection means anything*. A selection that matches the state you are already
in is a no-op whoever sent it:

```java
private OnItemSelectedListener ignoringNoOpSelections(
        Supplier<Integer> currentPosition, IntConsumer onRealChange) {
    return new OnItemSelectedListener() {
        @Override
        public void onItemSelected(AdapterView<?> parent, View v, int pos, long id) {
            // Android dispatches position 0 when the adapter is attached.
            // If it matches what we already have, nothing changed.
            if (pos == currentPosition.get()) return;
            onRealChange.accept(pos);
        }
        @Override public void onNothingSelected(AdapterView<?> parent) { }
    };
}
```

Both spinners use it, and the detach-reattach dance is gone.

The difference that matters: the first version tries to predict when the
framework will do something surprising. The second does not care. If a
selection arrives that changes nothing, it is ignored — whether it came from
layout, a configuration change, a restored instance state, or a future version
of Android doing something new.

**Making an event handler idempotent is more durable than trying to suppress
the event.**

## What I took from it

**"The user did X" is an assumption, not a guarantee.** UI callbacks fire
during layout, on rotation, on state restore, and on adapter changes. A
listener named `onItemSelected` reads like a user action and is not one.

**Guard on state, not on timing.** Suppression by timing — detach, post,
reattach — encodes a belief about framework internals into your code. Checking
whether the value actually changed holds regardless of how the event arrived.

**Redundant network calls are invisible until you look.** No crash, no error,
no user complaint. I found these because I happened to watch the logging
interceptor while using the screen. Whatever you do not instrument, you do not
know — and the cost lands on users with the slowest connections and the
tightest data plans, who are the least likely to tell you about it.
