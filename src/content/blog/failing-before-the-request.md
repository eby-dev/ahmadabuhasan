---
title: 'Failing Before the Request'
description: 'The server already knew the answer was no. Asking it again was costing users a round trip to be told something the app could see.'
publishedAt: 2027-05-06
draft: true
tags: ['android', 'kotlin', 'api-design']
---

Agents can boost a forum post to raise its visibility, with a weekly quota.
Run out, and the next boost fails.

Failing was the whole flow. Tap boost, confirmation sheet appears, confirm,
request goes out, server replies `417`, app shows an error. The user committed
to an action, waited, and got refused for a reason that was already known
before they tapped anything.

The quota was on screen at the time. The app had loaded it to render the
counter.

## Using what you already fetched

```kotlin
private fun onBoostClicked(post: Post) {
    // The quota snapshot is already loaded for the counter. If it says zero,
    // the round trip can only come back 417.
    if (hasBoostQuotaSnapshot && latestBoostRemaining <= 0) {
        showBoostQuotaEmptySheet()
        return
    }
    showBoostConfirmSheet(post)
}
```

Instead of a confirmation sheet leading to an error, the user goes straight to
a sheet that says the quota is spent and when it resets. No request, no wait,
no error dialog for something nobody could have done differently.

The `hasBoostQuotaSnapshot` flag is the important half. Without it, an unloaded
quota reads as zero and the app blocks a boost the user is entitled to — a
worse bug than the one being fixed, and invisible to whoever writes the check,
because on their machine the quota always loaded.

There is a related detail: the initial value of the max quota was `15`, a
hardcoded guess at the server's limit. Any number you invent for a value the
server owns is wrong eventually, and it will be wrong silently — a business
rule changes on the backend and one client keeps rendering the old one. It is
now `0` until the server says otherwise.

## Where this gets dangerous

Client-side pre-checks are how you end up enforcing business rules in two
places that drift apart. So the boundary matters.

The check is a **shortcut past a known answer**, not a replacement for the
server's decision. The server still validates every boost and still returns
`417`. If the snapshot is stale — the user boosted from another device, or the
quota reset while the app was open — the request goes out and the server
decides. Nothing was removed. A path was added for the case where the app
already has the answer.

The test I settled on: if the server-side check were deleted, would this be a
security hole? If yes, the client check is not a shortcut — it is the control,
in the wrong place. Here the answer is no. The server is unchanged, and the
app is skipping a question it knows the answer to.

## The small thing that took as long

The empty-quota sheet tells you when the boost resets, and the server sends
that as `2026-07-22 14:30:00`.

Showing a database timestamp to a user is a tiny failure of care that
accumulates. It became "Rabu, 22 Juli 2026" — localised, in the user's
language, with the time dropped because the relevant fact is the day.

That took about as long as the quota check, and it is the part users would
actually notice.

## What I took from it

**An error the user cannot act on should not be an error.** Same principle as
[reporting success for a partly failed
operation](/blog/the-error-the-user-should-not-see/): the useful question is
what the person can do. If the answer is "wait until Wednesday", say that,
rather than showing a failure and making them work it out.

**Distinguish "I already know the answer" from "I am deciding the answer".**
The first is a client-side optimisation and is fine. The second moves a
business rule onto a device you do not control. They look identical in the
diff, and the difference is whether the server check still exists.

**Data you already have on screen is data you can act on.** The quota was
rendered in the UI while the app sent a request to be told the same thing. It
is worth occasionally asking what a screen already knows that it is asking for
anyway.
