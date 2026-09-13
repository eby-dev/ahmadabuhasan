---
title: 'A Thousand-Line Function'
description: 'One method handled every link that could open the app. Cutting it in half changed nothing a user could see — which was the point.'
publishedAt: 2027-07-22
draft: true
tags: ['android', 'kotlin', 'refactoring']
---

Every link that opens the app lands in one place. A shared listing, a
notification, a password reset email, a marketing campaign — all of it arrives
as a URI at a single activity, which decides where the user should end up.

That activity was 1067 lines, and most of it was one method.

## How a function gets that long

Nobody wrote a thousand-line function. It accumulated, one reasonable
commit at a time.

A link type is added, so a branch is added. A link type behaves differently
for logged-out users, so the branch nests. A suspended agent should not reach
certain screens, so a callback wraps the branch. A path segment might be
missing, so a null check goes inside. An old link format still circulates, so
a second handler appears next to the first — and stays, because nobody can
prove the old links are gone.

Each change is small and defensible. The result is a method where finding the
handler for one link type means reading past a dozen unrelated ones, and where
the same condition is checked in four places because it was easier to add
another check than to work out whether the existing one already covered it.

The specific thing that made it unreadable was nesting. A check for the
suspended state was asynchronous, so every handler that needed it sat inside a
callback, which sat inside an `if`, which sat inside a `switch`. Real logic
was four or five levels deep, and the closing braces at the bottom of the file
were meaningless.

## Flattening it

Two changes, in that order.

**The async check became synchronous.** The suspended flag was fetched through
a callback, forcing every caller into a nested structure. That value was
already in shared preferences — written at login, read everywhere else:

```kotlin
// read directly instead of wrapping every handler in a callback
if (prefs.isSuspended) {
    goHomeWithMessage(prefs.suspendedMessage)
    return
}
```

One asynchronous dependency removed an entire level of nesting from every
handler in the file. It was not a performance change — it was a shape change,
and the shape was what made the file unreadable.

**Then the switch became functions.** Each link type got its own:

```kotlin
when (uri.firstSegment()) {
    "search"  -> handleSearch(uri)
    "profile" -> handleProfile(uri)
    "listing" -> handleListing(uri)
    else      -> openInBrowser(uri)
}
```

with early returns inside each rather than nesting:

```kotlin
private fun handleProfile(uri: Uri) {
    val id = uri.pathSegments.getOrNull(1) ?: return goHome()
    if (isSuspended) return goHomeWithMessage(suspendedMessage)
    startActivity(ProfileActivity.newIntent(this, id))
}
```

1067 lines to 416. No behaviour change that a user could observe.

## The dead code question

A large part of what disappeared was code that no longer ran: commented-out
blocks, a duplicate handler kept "just in case", helpers nothing called.

Deleting it is the part that feels risky, and I want to be honest about how I
decided. For each block, one question: is there any live path that reaches
this? Not *might this be useful* — that answer is always maybe, and it is how
the file got this way.

Commented-out code is the easy case. It is in version control. Keeping a
disabled copy in the file is strictly worse than deleting it, because every
future reader has to work out whether it matters.

The duplicate handler was harder, and it came down to reading the call sites
carefully and accepting a small risk in exchange for a file the next person
can read.

## What this kind of work is for

There is no user-facing outcome here. Nothing got faster, nothing new works,
no bug was fixed. A week on a refactor with an empty release note is a hard
thing to justify, and I think the justification has to be specific rather than
hygienic.

The specific one: this file is where every external entry into the app lands.
Marketing adds campaign links, the backend changes a URL structure, a new
feature needs a share link — all of that means touching this file. Every one
of those tasks was paying a tax proportional to how hard it was to read, and
the tax was rising, because each change made it slightly worse.

The test I used afterwards was the browser fallback. Previously an unrecognised
link dumped the user on the home screen with no explanation. Adding a proper
fallback — hand the URI to the system browser — was about fifteen lines in the
refactored file:

```kotlin
else -> openInBrowser(uri)
```

In the old version that would have meant finding the right `else` among many,
several levels deep, and being confident it was the only one. That difference
is the return on the refactor, and it only shows up on the next change rather
than this one.

## What I took from it

**Nesting comes from dependencies, not from logic.** The file was deep because
one value arrived asynchronously. Fixing how that value was obtained flattened
everything else for free. When a function is hard to read, it is worth asking
what is forcing the shape before restructuring the branches.

**Commented-out code is a message to the future that says "I was not sure".**
It is in git. Delete it, and let the next reader trust that what they see is
what runs.

**Justify refactors by the next change, not by cleanliness.** "It is now
tidier" is not an argument anyone has to accept. "Adding a link type used to
take a day of careful reading and now takes an hour" is.
