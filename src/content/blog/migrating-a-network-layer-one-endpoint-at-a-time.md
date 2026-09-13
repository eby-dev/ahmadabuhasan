---
title: 'Migrating a Network Layer One Endpoint at a Time'
description: 'Replacing the HTTP stack in a live app, starting with a single popup nobody would miss.'
publishedAt: 2027-02-13
draft: true
tags: ['android', 'retrofit', 'migration']
---

The app talks to eight backend hosts through a networking library that is no
longer maintained. Replacing it with Retrofit is obviously correct and
obviously risky: every screen makes network calls, and a mistake in the
shared layer breaks all of them at once.

So the first thing I migrated was a popup that checks whether an agent should
be reminded to file a report.

One endpoint. Not on any critical path. If it broke entirely, the reminder
would not show and nothing else would change.

## Two stacks at once, on purpose

The point of picking a small endpoint is not the endpoint. It is that building
the infrastructure for one real call forces you to solve every structural
problem before anything important depends on the answer.

That infrastructure turned out to be a lot for "one popup": a Dagger module
providing `OkHttpClient` and `Retrofit`, named instances for each of the eight
hosts, the existing interceptors rewired, timeouts matched to the old client's
behaviour.

And a small thing I would not have predicted — Retrofit requires base URLs to
end in a slash, and throws at construction time if they do not. The old
library did not care. Config that had been fine for years was suddenly a crash
on startup, so the module normalises every URL and handles the null and blank
cases that turned out to exist in some build configurations.

That is the kind of thing you want to discover while migrating a popup.

The awkward part is that both stacks now run side by side, and error handling
has to speak both languages:

```java
// existing
protected void handleApiError(ANError error) { ... }

// added
protected void handleApiError(retrofit2.HttpException error) { ... }
```

Same logic in both: log to Crashlytics with request metadata, parse the error
body, force a logout on 401 and 403 for particular paths, surface a message.
Duplicated, deliberately, because the alternative is an abstraction over both
error types — which means designing that abstraction before knowing how the
migration actually goes.

Two implementations you can delete one of later beat one abstraction you
committed to early.

## What "one at a time" costs

I want to be straight about the downsides, because incremental migration gets
recommended as though it is free.

The app now ships two HTTP clients. Both are in the APK, both have
interceptors, both maintain connection pools. There is a period — possibly a
long one — where the codebase is strictly more complicated than it was before
the migration started, and strictly more complicated than it will be at the
end.

New code has to pick a stack, and the right answer depends on how far along
the migration is. Anyone joining the team has to learn both and know which is
which.

I took that trade because the failure modes are not symmetric. A big-bang
rewrite of the network layer either works or takes down every screen for
everyone, and you find out in production. The incremental version has a worse
middle and a bounded blast radius at every step.

I have also seen the other outcome of this approach: a migration that stalls
at 60% and stays there for years, leaving a codebase with two ways to do
everything and no one who remembers why. That is the real risk, and it is not
a technical one.

## Documenting the seam

The one thing I did that I would repeat without hesitation is updating the
README the same week — which stack is being migrated to, which calls use
which, and how to decide for new code.

A half-migrated codebase is not self-explanatory. Someone reading it in six
months sees two networking libraries and no way to tell whether that is a
plan, an accident, or something abandoned halfway. The difference between
those three lives entirely in whether someone wrote it down.

While I was in there I found facts in that README that had quietly stopped
being true — libraries listed that we had removed, patterns described that we
no longer follow. Documentation drifts silently in exactly the way this
migration would, if nobody kept a note of where the boundary is.

## What I took from it

**Pick the first migration target for its blast radius, not its
representativeness.** A popup exercises DI, interceptors, error handling, and
configuration. It is not a typical endpoint, but it proves the structure while
the cost of being wrong is a reminder nobody sees.

**Duplicate before you abstract.** The second implementation teaches you what
the two cases actually share. Designing the shared abstraction from the first
one is guessing.

**Write down the boundary.** An incremental migration is a codebase in a state
no one designed, and the plan lives in one person's head. That is fine while
you are there. It stops being fine the moment you are not.
