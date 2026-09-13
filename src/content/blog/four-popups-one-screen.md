---
title: 'Four Popups, One Screen'
description: 'Every popup was correct on its own. Together they stacked on top of each other, and the fix was not in any of them.'
publishedAt: 2027-03-05
draft: true
tags: ['android', 'architecture', 'ux']
---

The home screen of the app can show an advertisement, a passive-info dialog, a
reminder to contact your team, and an eligibility popup for a new feature.

Each was built at a different time by a different person for a different part
of the business. Each was correct. Each checked its own conditions, called its
own endpoint, and showed itself when its answer came back.

Which meant that on a bad morning, a user opened the app and got all four —
stacked, in whatever order the network happened to return them, with the last
one on top.

## Nobody owned the sequence

The bug is not in any of the four features. Every one of them does exactly
what it was asked to do. The problem is that showing a popup is not a local
decision, and all four were making it locally.

There was no answer to "what is on screen right now" because nothing tracked
it. Four independent async callbacks, each with permission to take over the
screen, racing on network timing.

That is also why it was so hard to reproduce. On office wifi the ad usually
won and the rest arrived while it was open, so they queued up behind it and
looked fine. On a slower connection the order shuffled. The bug was a race,
and races are invisible on the machine where everything is fast.

## A gate, not a queue

The fix is a small amount of shared state in the presenter that all four have
to ask:

```java
// Ads go first; everything else only if the screen is still free.
private boolean adsFinished = false;
private boolean screenTaken = false;
```

Every popup path routes through a check instead of showing itself:

```java
private void maybeShow(Popup popup) {
    if (!isViewAttached()) return;
    if (!adsFinished) return;        // ads still deciding; try again later
    if (screenTaken) return;         // someone else already has the screen
    if (popup.shownThisSession) return;

    popup.shownThisSession = true;
    screenTaken = true;
    view().show(popup);
}
```

And the thing that was missing entirely — a signal when a popup goes away, so
the next one gets its turn:

```java
public void onAdsClosed() {
    adsFinished = true;
    maybeShow(nextInPriority());
}
```

Each feature still caches its own response. What changed is that having an
answer no longer grants permission to display it. The response is held, and
the gate decides when — or whether — it is shown at all.

## The decisions inside that

**At most one per session, not one per launch.** The flags reset on logout,
not on every trip through the home screen. Going back to home after browsing a
listing is not a new opportunity to interrupt someone.

**Explicit priority, and ads win.** Not because ads matter most to the user,
but because ads have an external contract — impressions are counted and
someone is paying for them. The other three can be shown later; a missed
impression is gone. Making that ordering explicit also made it reviewable,
which is the part that had been missing.

**Silence is a valid outcome.** If the ad shows, the other three do not appear
at all. They are not queued for after. A reminder that arrives fourth, after
the user has already dismissed three things, is not a reminder — it is noise
that trains people to tap through dialogs without reading them.

That last one was the real argument during review, and I think it is the most
important line in the whole change. The instinct is to queue: everything gets
its turn, nothing is lost. But a queue optimises for the features. Dropping
optimises for the person holding the phone, who has four seconds of patience
and came here to do something else.

## What I took from it

**"Can I show this?" is a global question with a local answer, and that is the
bug.** Any feature that takes over the whole screen needs to ask something
that knows about the other features. There is no way to get this right from
inside one of them.

**Features that never meet in code still meet on screen.** Four separate
modules, four separate tickets, four separate reviews — and one user, one
screen, one morning. Nothing in the development process put those four things
in the same room until a user did.

**Dismissal is an event worth broadcasting.** The original code knew how to
show things and nothing about when they went away. Half of coordination is
knowing when something finished, and it is the half people forget to build.
