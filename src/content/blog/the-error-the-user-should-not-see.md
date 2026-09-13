---
title: 'The Error the User Should Not See'
description: 'Showing an honest error message caused duplicate tickets. The fix was to report success for an operation that had partly failed.'
publishedAt: 2027-01-11
draft: true
tags: ['android', 'error-handling', 'ux']
---

The in-app bug reporter files a ticket and attaches a screenshot. Two network
calls: create the issue, then upload the attachment to it.

Sometimes the second one failed — often because the screenshot file had been
evicted from storage while the user was typing, which is [its own
story](/blog/the-file-that-was-there-a-minute-ago/). The app did the obvious
thing and told the truth:

> Failed to send report. Please try again.

So the user tapped Send again. And again. And the team woke up to three
identical tickets, each with a slightly different description, because the
first two calls had all succeeded.

## The operation was not atomic, and the UI pretended it was

The flow has two steps and a boundary in the middle:

1. Create the issue — succeeded
2. Upload the attachment — failed

The UI collapsed both into one verdict. Since step 2 failed, it reported
failure, and offered the only remedy it knew: retry. But retry re-runs step 1
as well, and step 1 was never the problem.

Once you see it that way the honest error message is not honest at all. It
says "your report did not go through" when the report went through perfectly.
The user acts on that information, correctly, and makes things worse.

The fix reads wrong at first glance:

```kotlin
override fun onJiraAttachmentFailed() {
    // The issue was already created; only the attachment failed. Surfacing an
    // error here made users resubmit and file duplicates. The failure is still
    // tracked in Crashlytics from the presenter.
    onJiraIssueCreated()
}
```

An attachment upload fails, and the app shows the success screen.

## Why that is the right call

Two questions were tangled together, and I had been answering only one:

**What happened?** Partial failure. The ticket exists, the screenshot is not
on it.

**What should the user do about it?** Nothing. There is no action available to
them that improves the outcome. Retrying files a duplicate. Waiting changes
nothing. The screenshot is gone from disk and no amount of tapping brings it
back.

An error message is not a status report — it is a request for action. When
there is no useful action, showing one converts a small internal problem into
a user-facing problem, and in this case into a worse internal problem than the
one we started with.

The failure did not get hidden. It goes to Crashlytics with the details, which
is how the storage bug was found and fixed in the first place. It stopped
being shown to the one person in the loop who could do nothing with it.

## Where this stops being true

I am wary of this pattern, because "report success anyway" is one step from
swallowing errors, and that habit is how you end up with an app that lies to
people.

The line I settled on is the user's available actions. Reporting success is
defensible when the user's goal was achieved, the residue is invisible to
them, someone else is told, and there is no action they could take. Change any
one of those and it flips. If the ticket had failed to create, that is a
straight failure with a real retry. If the screenshot were the point rather
than a nice-to-have, the right move is to say the report went through without
the image.

What makes this case easy is that the attachment is supporting evidence for a
ticket that already has a written description. Losing it costs the team a
little context. Telling the user costs them their time and costs us duplicate
tickets.

## What I took from it

**Decide what to show from what the user can do, not from what happened.** The
technical outcome determines what you log. The available actions determine
what you display. I had been deriving the second from the first.

**A retry button is a claim that retrying helps.** Offering one on a
non-idempotent multi-step operation is worse than offering nothing, because
the user trusts it and it costs them.

**Duplicate records are an error-handling smell.** When the same report, order
or ticket shows up several times, it is usually not users being careless. It
is the UI telling them something failed when part of it did not.
