---
title: 'Exit 141'
description: 'A build step failed at random, maybe one run in five, with nothing in common between the failures. The command worked. The pipe in front of it did not.'
publishedAt: 2026-10-30
draft: true
tags: ['ci-cd', 'android', 'bash']
---

A CI pipeline started failing at random. Not every run — perhaps one in five,
with nothing in common between the ones that failed and the ones that passed.
Rerun the same commit and it would usually go green.

The failing step was one line, and it had been there, unchanged, for a long
time:

```yaml
- yes | sdkmanager --sdk_root=$ANDROID_SDK_ROOT "platforms;android-36" > /dev/null
```

Exit code 141.

## What 141 means

Shells report a signal death as 128 plus the signal number. 141 is 128 + 13,
and signal 13 is `SIGPIPE`: a process wrote to a pipe that nothing is reading
any more.

Which points straight at the `yes |`.

`yes` prints "y" forever. `sdkmanager` reads as many as it needs and exits.
The moment it does, the pipe closes and `yes` — still writing — gets SIGPIPE
and dies. That is normal and harmless; it is how every `yes | something`
pipeline in the world ends.

The problem is who reports the exit code. A pipeline's status is its _last_
command, so normally `sdkmanager`'s success is what counts. But under
`pipefail`, which CI runners commonly enable, a failure anywhere in the
pipeline wins — and `yes` dying of SIGPIPE is a failure.

So the race: if `yes` is mid-write when the pipe closes it dies of SIGPIPE and
the step fails. If it happens to be between writes, it exits quietly and the
step passes. Same command, same input, two outcomes, decided by timing on a
loaded build machine.

## The `yes` was never needed

The fix is not to make the pipe safer. It is that the pipe had no reason to
exist.

`yes | sdkmanager` is the standard incantation for accepting Android SDK
licence prompts. Our CI image already accepts those licences when the image is
built. `sdkmanager` was never going to ask, so nothing was ever going to read
those "y"s.

The line was carried over from a tutorial, kept through several image
upgrades, and nobody looked at it again — because it worked, and because it
looks like something you are supposed to write.

```yaml
# Licences are pre-accepted at image build time, so sdkmanager runs
# non-interactively. No `yes |` — the pipe caused a SIGPIPE race (exit 141).
- test -d "$ANDROID_SDK_ROOT/platforms/android-36" || \
  sdkmanager --sdk_root=$ANDROID_SDK_ROOT "platforms;android-36"
```

The `test -d` is a second, smaller thing: `sdkmanager` is idempotent, so
running it on an already-installed platform is a no-op — but a no-op that
still costs twenty seconds of network and unpacking on every build. Checking
first skips it entirely on most runs.

## Why this one was hard to see

Two properties made it survive so long.

**It was intermittent.** A step that fails every time gets fixed immediately.
A step that fails one run in five gets rerun, passes, and everyone moves on.
The cost is spread thin enough that nobody has a bad enough day to
investigate.

**It looked like an incantation.** `yes | sdkmanager` is not code you read.
It is a shape you recognise from setup guides, and recognition is what stops
you from asking what it does. I had looked at that line many times while
changing things around it.

The actual lesson is not about SIGPIPE. It is that **a command you copied is a
command you have not read**, and CI configuration is where those accumulate —
because it is written once under time pressure, it works, and nothing invites
you back.

## What I took from it

**An intermittent failure is a race until proven otherwise.** Same input,
different outcomes, means something is racing. Reruns are not a diagnosis,
they are a way of not having one.

**Exit codes above 128 name a signal.** Subtract 128 and look it up. 141 is
SIGPIPE, 137 is SIGKILL — usually the out-of-memory killer — and 143 is
SIGTERM, usually a timeout. That arithmetic turns a meaningless number into
the first real clue.

**Ask what each part of a copied command is for.** Not to rewrite it — most of
the time the answer is "it is correct and I now understand why". This one had
an answer, and the answer was that it had never applied here at all.
