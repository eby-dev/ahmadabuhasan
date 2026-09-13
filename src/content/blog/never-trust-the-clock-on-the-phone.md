---
title: 'Never Trust the Clock on the Phone'
description: 'A fifteen-minute edit window sounds like a timer problem. It is an authority problem, and the timer is the least important part.'
publishedAt: 2027-02-23
draft: true
tags: ['android', 'kotlin', 'api-design']
---

The app has a forum. Agents post, comment, and discuss listings. Product asked
for an edit window: you can fix your own comment for fifteen minutes after
posting, then it locks.

The obvious implementation is four lines. You have the comment's creation
timestamp, you have the current time, subtract and compare:

```kotlin
val elapsed = System.currentTimeMillis() - comment.createdAt
if (elapsed < FIFTEEN_MINUTES) showEditIcon()
```

This works, and it is wrong in a way that has nothing to do with the
arithmetic.

## Who decides what "now" is

`System.currentTimeMillis()` reads the device clock. The device clock belongs
to the user. Settings, automatic time off, set it to yesterday, and every
comment they have ever written is editable again.

That is the loud failure. The quiet one is more common and affects people
acting in good faith: phones drift, timezones are set wrong while travelling,
and a device a few minutes fast will lock editing early for someone who has
done nothing unusual. They see a feature that is simply broken, and there is
nothing in the app to explain why.

Both problems have the same root. The client was being asked to _decide_
something, and the client is not in a position to decide anything the server
cares about.

So the rule moved to the server, and the API started saying so directly:

```java
// Comment model
private boolean canEdit;      // server's verdict
private String editableUntil; // when it expires, for display
```

The client stopped computing eligibility:

```kotlin
// before: ownership only, computed locally
// if (isMyPost) showEditIcon()

// after: ownership AND the server's verdict
if (isMyPost && comment.isCanEdit) showEditIcon()
```

The device clock no longer takes part in the decision.

## The countdown still needs a clock

Hiding the icon is not enough on its own. Someone can open the editor with
fourteen minutes left, write a long reply, and hit save after the window has
closed — so the screen shows the time remaining, counting down:

```kotlin
// editableUntil is a server timestamp; parse in the server's zone,
// not the device's, or a traveller sees hours of drift
val remaining = parseInJakartaTime(editableUntil) - System.currentTimeMillis()

object : CountDownTimer(remaining, 1000) {
    override fun onTick(ms: Long) { showRemaining(ms) }
    override fun onFinish() { btnPost.isEnabled = false; showExpired() }
}.start()
```

Note that the device clock is back — and that this is fine. The countdown is a
_display_, and its worst failure is showing a number that is slightly off. The
decision that matters, whether the save is accepted, still belongs to the
server, which will reject a late request regardless of what the phone
believed.

That distinction is the whole design:

**The server decides. The client explains the decision.**

The two `CountDownTimer` details worth keeping: parse `editableUntil` in the
server's timezone rather than the device's, or a user in another country sees
a window hours off; and cancel the timer in `onDestroy`, because a running
timer holds a reference to the activity.

## Why not just let the server reject it

A fair question: if the server rejects late edits anyway, why show a countdown
at all?

Because "the server will reject it" describes correctness, not the
experience. Without the countdown, a user writes a careful three-paragraph
correction, hits save, and gets an error. Their work is gone and nothing
warned them.

The server check is the guarantee. The countdown is the courtesy. You need
both, and it is worth being clear about which is which — because when they
disagree, the guarantee wins, and the UI has to be built to accept that.

## What I took from it

**Anything a user can change is an input, not a fact.** The device clock,
timezone, and locale all feel like properties of the world. They are settings.
Any rule enforced against them is a rule that can be edited in Settings.

**Split "may I?" from "how long do I have?"** The first is authorisation and
belongs to whoever owns the data. The second is presentation and belongs to
the screen. Computing the first from the second is what put the rule in the
wrong place to begin with.

**A client-side check is a courtesy to the honest user, not a control.** It
tells someone acting in good faith what is going on. It stops nobody. Once I
started naming which of the two a check was for, it got much easier to see
which ones were load-bearing and which were decoration.
