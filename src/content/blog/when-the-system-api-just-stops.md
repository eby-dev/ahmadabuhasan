---
title: 'When the System API Just Stops'
description: 'DownloadManager does not always fail. Sometimes it accepts the job, reports it as running, and never speaks again.'
publishedAt: 2026-11-03
draft: true
tags: ['android', 'kotlin', 'okhttp']
---

Agents download brochures and marketing posters from the app constantly. It
used Android's `DownloadManager` for this, which is the reasonable choice: you
hand it a URL, it downloads in the background, survives process death, shows a
notification, and broadcasts when it is finished.

Support kept getting the same report anyway. _I tapped download and nothing
happened._ No error, no file, no notification. Just nothing.

## Three ways it goes wrong

Reproducing it took a while because there was not one bug, there were three,
and they cluster on particular OEM builds — heavily customized Android with
aggressive background management.

**It throws on enqueue.** `DownloadManager.enqueue()` can raise from the
system's own download provider process. Nothing you can fix from your side,
and nothing you can catch either unless you wrapped the call.

**It fails and tells you.** The broadcast arrives with `STATUS_FAILED`. This
one is honest, and the old code handled it by showing a retry snackbar.

**It accepts the job and goes quiet.** This is the one that produced the
support tickets. The download sits at `PENDING` or `RUNNING`, the broadcast
never fires, and the app waits forever for a completion signal that is not
coming. From inside the app it is indistinguishable from a slow network.

You cannot detect that third case by listening harder. There is no failure to
listen for. The only way to notice is to stop waiting and go look.

## A watchdog and a fallback

Two pieces. The first is a plain HTTP downloader built on OkHttp, which the
app already had for its API calls. The second is a timer that checks whether
`DownloadManager` is actually making progress:

```kotlin
// after enqueueing, check back once
handler.postDelayed({
    if (stillRunning(id)) {
        // On some OEM builds the completion broadcast never arrives,
        // so treat "still running" as stuck rather than slow.
        cancel(id)
        markRecovered(id)
        downloadOverHttp(url)
    }
}, STUCK_TIMEOUT_MS)
```

Ten seconds, then cancel and re-download over plain HTTP. The user sees a
file, a little later than they should have, and never learns any of this
happened.

The set of recovered ids is there because of a race I hit immediately. If
the system broadcast arrives _just after_ the watchdog gives up, both paths
try to handle the same download and the user gets it twice. Anything that
recovers a download has to record that it did, and every other path has to
check that record first.

Timeouts are a blunt instrument, and ten seconds is a guess. A genuinely slow
download on a weak connection gets cancelled and restarted, which wastes the
bandwidth already spent. I took that trade because the fallback succeeds in
the common case anyway — the cost of a false positive is a slower download,
and the cost of a false negative is a feature that silently does not work.

## Instrumenting the guess

The part I would not skip again is the logging. Every path reports to
Crashlytics with a tagged prefix:

```
[DM_FAIL]                  DownloadManager reported failure
[FALLBACK_OK]              fallback recovered it
[FALLBACK_FAIL]            both paths failed
[FALLBACK_OK_FROM_STUCK]   watchdog fired and recovery worked
[FALLBACK_FAIL_FROM_STUCK] watchdog fired and recovery also failed
```

Each one carries SDK version, manufacturer, and model.

That turned a hunch into something I could check. The failures were not spread
evenly across devices — they concentrated on specific OEM builds, which is
what confirmed this was platform behaviour rather than a network problem or
something wrong in our code. And `[FALLBACK_OK]` versus `[FALLBACK_FAIL]` says
whether the workaround is worth keeping, which is not a question I want to
answer from memory a year from now.

The five-tag scheme took ten extra minutes to write and is the only reason I
can say any of this with confidence.

## What I took from it

**A system API can fail by not responding at all.** I had error handling for
the call throwing and for the call reporting failure. I had nothing for the
call accepting the work and going silent, because the API's contract implies
that cannot happen. On 3,000 different device models, the contract is a
description of the common case.

**Anything you wait on needs a deadline.** Not because you expect the timeout
to fire — because a wait with no upper bound is a state your app can enter and
never leave, and from the user's side that is identical to a feature that does
not exist.

**Every recovery path needs to leave a mark.** The duplicate-download race and
the question of whether the fallback even helps are both answered by the same
discipline: record what you did, check the record before acting. Recovery code
runs rarely and in conditions you cannot reproduce, which is exactly why it
should be the best-instrumented code you have.
