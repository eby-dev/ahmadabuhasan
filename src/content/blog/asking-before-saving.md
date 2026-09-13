---
title: 'Asking Before Saving'
description: 'A scheduling clash you can only discover after saving is a bug report. Discovered before, it is a question.'
publishedAt: 2027-04-25
draft: true
tags: ['android', 'kotlin', 'api-design']
---

Agents schedule site visits in the app. Pick a date, a time, a destination,
save. The problem is that the same agent may already have something booked
then — or the principal they are visiting might.

The original flow found out at save time. You filled in the form, submitted,
and the server rejected it with a clash error. Your input was still on screen,
so nothing was lost, but you had committed to a plan before anyone told you it
was not available.

## A second endpoint that changes nothing

The fix is a preview call. Before submitting, the app asks the server what
*would* happen:

```
POST  /schedule        creates the booking
POST  /schedule/preview  same payload, writes nothing,
                         answers "would this clash?"
```

The preview response carries two things: whether there is a clash at all, and
who it belongs to — the person booking, or someone else involved.

That second part is why it has to be a server call. The user's own agenda
could be checked on the device. The other party's could not.

Clear, and the submit goes through as before. A clash, and the user gets a
dialog naming it and asking whether to continue anyway.

That last part matters more than the detection. The clash is not forbidden —
sometimes an agent genuinely needs two things booked close together, and
sometimes the existing entry is stale. The server was never trying to prevent
the clash. It was trying to make sure the person knew about it.

Which is precisely the thing a save-time error is bad at. An error after
submission reads as *you did something wrong*. The same information before
submission reads as *here is something you may not have known* — and leaves
the decision where it belongs.

## Why not check on the client

The app has the agent's own agenda cached. Checking locally would have been
faster and needed no endpoint.

It would also only cover half the cases. The other principal's agenda is not
on this device and should not be — one agent's phone has no business holding
another's schedule. And a local check is only as fresh as the last sync, which
on a phone that has been in a pocket all morning is not fresh at all.

There is a general shape here worth naming. A check is only meaningful where
all the data lives, and for anything involving other people, that is never the
client. The same reasoning as [the edit
window](/blog/never-trust-the-clock-on-the-phone/) — the rule goes where the
truth is, and the client's job is to present the answer.

## Two round trips, one submit button

The cost is that saving now takes two calls, and between them is a dialog the
user may sit on for a while. That opens a gap, and gaps invite double
submissions:

```kotlin
// one guard covering both the network call and the dialog —
// the window between preview and submit is the vulnerable part
private var isSubmitting = false
```

Set when the preview starts, cleared only when the whole sequence ends —
success, failure, or the user backing out of the dialog. Without it, an
impatient second tap starts a second preview while the first dialog is open,
and the two flows race to submit.

Nothing fancy, but it is the kind of guard that is easy to scope too narrowly.
Covering only the network call would leave the dialog wide open, and the dialog
is where the user actually spends time.

## What I took from it

**Validation and submission do not have to be the same request.** Splitting
them costs a round trip and buys the ability to inform someone while they can
still change their mind. For anything with a real-world consequence — a
booking, a payment, a message that goes to another person — that trade is
usually worth it.

**"Warn and allow" is a distinct outcome from "accept" and "reject".** The
system does not always know better than the user. Knowing something they do not
is different from having the authority to decide for them, and collapsing those
two is how software gets a reputation for being obstructive.

**Every new async step needs its guard re-examined.** The submission guard
existed already and covered the old single call. Adding a step in front of it
moved the vulnerable window somewhere the guard was not looking.
