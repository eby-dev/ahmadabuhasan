---
title: 'Bugs That Never Appear on the First Screen'
description: 'Two list bugs that testing does not find, because both need you to scroll before they exist.'
publishedAt: 2026-12-17
draft: true
tags: ['android', 'recyclerview', 'performance']
---

A contact list in the app shows a photo for each person, and initials in a
coloured circle for anyone without one. It worked. Then someone scrolled fast
and reported that photos were landing on the wrong people — a contact with no
photo would briefly show someone else's, then correct itself.

The cause is the thing that makes lists fast in the first place.

## Recycling, and what it hands you

A `RecyclerView` does not create a view per row. It creates enough for one
screen plus a few, and as you scroll it takes views that have left the top and
rebinds them at the bottom. `onBindViewHolder` never gets a blank view. It
gets somebody else's, already filled in, and it is your job to overwrite every
part of it.

The binding code was roughly:

```kotlin
if (contact.photoUrl.isNotEmpty()) {
    Glide.with(context).load(contact.photoUrl).into(avatar)
} else {
    avatar.setImageDrawable(initialsDrawable(contact))
}
```

Which looks complete — both branches set the image.

The gap is that image loading is asynchronous. When a row with a photo is
bound, Glide starts a network request against that specific view. If the user
scrolls before it finishes, that same view gets rebound to a contact with no
photo, and the `else` branch draws the initials. Then the earlier request
completes, finds the view it was given, and draws the photo over the top.

The initials branch set the image but never cancelled what was already in
flight:

```kotlin
// cancel any in-flight load from a recycled item, otherwise it
// lands on this view later and replaces the initials
Glide.with(context.applicationContext).clear(avatar)
avatar.setImageDrawable(initialsDrawable(contact))
```

The rule underneath it: **every branch of a bind must account for every
asynchronous thing any other branch may have started.** Setting a value is not
enough if something else is on its way to set it again.

## The second one: work that repeats

A different list, a different problem, same reason nobody noticed.

Each row showed whether a listing was bookmarked. The check went through a
compatibility layer:

```kotlin
holder.bookmark.isChecked = item.legacyModel.bookmark
```

`legacyModel` was not a stored object. It built one on access, re-parsing a
chunk of the response to produce a model the older UI code expected. So every
row, every bind, re-parsed a data tree to read one boolean that was already
sitting on the object:

```kotlin
holder.bookmark.isChecked = item.isBookmark
```

`onBindViewHolder` runs on the main thread, for every row, every time one
scrolls into view. Work that is fine once per screen is not fine sixty times a
second. A compatibility shim built for a migration had quietly become a
per-frame cost, and it never showed up as a bug report — just a list that felt
slightly worse than the others.

## Why testing misses both

Neither bug exists on a screen that does not scroll.

Open the list, look at it, tap a row, go back — the normal path through a
manual test — and both are invisible. The flicker needs a fast scroll past a
row without a photo while a slow request is outstanding, which means it also
needs a slow connection, so it is at its worst for the users least able to
report it clearly. The parsing cost needs a long enough list for the frame
budget to matter.

The device on the desk is fast and on office wifi. Both bugs live in the gap
between that and a mid-range phone on mobile data, and the more senior you
get, the better your test device usually is.

## What I took from it

**Async work has to be cancelled by whoever takes over the view.** Not by the
code that started it — it has already moved on. The next bind owns that view,
including the outstanding promises made against it.

**Anything a bind touches should be already computed.** `onBindViewHolder` is
a hot path with a frame budget. If reading a field means parsing, mapping, or
allocating, that work belongs where the data is prepared, not where it is
displayed.

**Compatibility layers need an expiry date.** `legacyModel` was a sensible
bridge during a migration. Nothing marked it as temporary, so it stayed, and
it stopped being a bridge and became a cost nobody was looking at. A shim that
outlives its migration is just a slow path with a reassuring name.
