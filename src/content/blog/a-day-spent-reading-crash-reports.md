---
title: 'A Day Spent Reading Crash Reports'
description: 'Five crashes fixed in one afternoon, none of which anyone had reported. They had been there for months.'
publishedAt: 2027-10-07
draft: true
tags: ['android', 'crashlytics', 'process']
---

One afternoon I opened the crash dashboard and worked down it instead of
working on a ticket. By the end of the day I had fixed five crashes.

None of them had a bug report. Some had been happening for months.

## Why nobody reported them

Each one affected a small number of users, in circumstances they could not
describe. A crash when tapping sort on a screen reached from one particular
path. A crash on a permission dialog if you rotated the phone while it was
open. A crash dismissing a dialog as the activity was closing.

From the user's side, the app closed. That is all they know. There is no
message, no error, nothing to report except "it crashed sometimes", and most
people do not report that — they reopen the app and carry on. An agent in the
middle of showing a property is not going to file a ticket.

So the dashboard was the only place these existed. They had been sitting
there, counted, sorted by frequency, waiting for someone to look.

## What made a day work better than a ticket

I had fixed crashes before, one at a time, when one was severe enough to get
escalated. Doing five in one sitting was different in a way I did not expect.

**Patterns appeared.** Three of the five were the same underlying issue — a
callback firing after its screen was gone. Individually they were three
unrelated tickets with three unrelated stack traces. Together they were one
lesson, and fixing them together meant the third took ten minutes instead of an
hour. I wrote about that pattern separately, because it turned out to be worth
its own explanation.

**The fixes were small.** Most were a guard clause. Two or three lines each.
The work was not in the fixing — it was in reading the stack trace carefully
enough to understand which lifecycle assumption had been violated.

**Frequency ordering was useful but not sufficient.** The dashboard sorts by
count, which surfaces the crashes affecting the most people. It says nothing
about how bad each one is for the person it hits. A rare crash in the middle of
submitting a listing costs more than a common one on a screen people leave
anyway.

## The boring part that made it possible

None of this works if the dashboard is noisy.

Earlier I had fixed something unglamorous: the base presenter was sending log
entries to Crashlytics with empty endpoints and a zero error code. Records with
no information, filed because the logging path ran unconditionally.

```java
if (logEndpoint.isEmpty() && logParams.isEmpty() && "0".equals(errorCode)) {
    return;
}
```

Nothing crashes from an empty log. What it does is make the dashboard worse,
slowly, in a way nobody notices — until the day you try to use it as a work
queue and cannot tell signal from filler.

**Your crash reporting is a tool, and tools need maintenance.** Custom keys
that are always empty, non-fatals logged for conditions that are normal, the
same exception reported from five places without context — each one makes the
next investigation harder. It degrades gradually enough that there is never a
moment where it is obviously broken.

## Would I schedule it

I think so, though I did it once and cannot claim it as a habit.

The argument for it is that this work has no other route into the backlog. A
bug that nobody can describe will never become a ticket, and severity-based
escalation only catches the top of the list. Everything below that threshold is
invisible to the normal process — not deprioritised, just never seen.

The argument against is that it is unbounded. A dashboard always has more
entries, and most of them are genuinely not worth fixing. Without a limit, "read
the crash reports" becomes a week. A fixed box — one afternoon, the top few by
count, stop when the afternoon ends — is what made it feel like work rather
than an open-ended cleanup.

What I would not do is wait for the next crash severe enough to get escalated.
By then it is an incident, and incidents are a worse time to be learning that
three of your screens share a lifecycle bug.

## What I took from it

**A crash with no reproduction steps is still a bug you can fix.** The stack
trace usually tells you the assumption that was violated, even when nobody can
tell you how they got there.

**Reading the dashboard in bulk finds patterns that reading it one entry at a
time cannot.** Sorted by stack trace they were five tickets. Sorted by what
went wrong they were two.

**Protect the signal in your monitoring.** Empty logs, meaningless custom keys,
and noise you have stopped noticing are a slow reduction in your ability to see
anything. Cleaning that up is invisible work that makes the visible work
possible.
