---
title: 'The Optional Step That Blocked Login'
description: 'Signing in fetched a push notification token first. When that fetch failed, nobody could get into the app at all.'
publishedAt: 2026-10-16
draft: true
tags: ['android', 'kotlin', 'firebase']
---

Signing in to the staff app runs one step you would not expect: before the
credentials go anywhere, the app asks Firebase for a push notification token
and sends it along with them. The server stores it so it knows where to
deliver notifications for that device.

Sensible. It also meant that when the token fetch failed, login failed.

```kotlin
FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
    viewModel.login(email, password, deviceId, token)
}
```

One listener. Success only. If the fetch fails — no network on that
particular call, Google Play Services having a bad morning, a device where
Firebase cannot reach its servers — nothing happens. No error, no login. The
button is tapped and the screen sits there.

## Ranking the steps

The fix is two lines, and the thinking behind them is the part worth keeping:

```kotlin
.addOnFailureListener {
    AppLogger.e(it, "FCM token failed")
    viewModel.login(email, password, deviceId, "")   // proceed without it
}
```

Log it, then log in anyway with an empty token.

The consequence of an empty token is that push notifications will not reach
this device until the token is refreshed — which happens on the next
successful launch. That is a real degradation, and it is nothing next to
being unable to open your work app at all.

What had gone wrong was not the missing failure listener. It was that two
steps of very different importance had been chained as if they were equal:

- **Authenticating** — the point of the screen. If this fails, stop.
- **Registering for push** — a convenience. If this fails, carry on.

Chaining them put the second in front of the first. The most fragile part of
the flow — a network call to a third-party service — became a gate on the part
that actually matters.

**Every dependency in a flow needs a rank, and the flow should fail only at
the steps that earned it.**

## The other two, from the same day

Once you start asking "what happens if this step fails", the login screen had
more to answer for.

**A server rejection was shown as a toast.** When an account is blocked, the
server returns a message explaining why — contact HR, the account is
suspended, that sort of thing. It was displayed with
`Toast.makeText(...).show()`, which vanishes after two seconds and cannot be
re-read.

```kotlin
// blocked is a state the user has to act on, not a transient error
showBlockedDialog.postValue(metaText)
```

A dialog instead. It stays until dismissed, and it looks like what it is: a
decision about their account, not a network hiccup. Same information, and the
difference between a user who knows what to do and a user who taps Login
again.

**Clearing the session blocked the UI.** On a failed login the app clears any
stored session — preferences, database, cached files. That was running on the
main thread, in a path that already felt slow because the user had just waited
on a network call.

Moving it to a background thread is obvious in isolation. It was easy to miss
because a cleanup on a small database is fast on a test device with almost
nothing stored, and slow on a real one after months of use.

## What I took from it

**An optional step in a required flow must not be able to stop it.** If push
notifications are nice-to-have, the login path has to keep working when they
are unavailable. Chaining them expresses the opposite, and nothing in the code
says which of the two is more important.

**A failure listener is not boilerplate.** `addOnSuccessListener` on its own
is a statement that the operation cannot fail. For anything touching the
network, that statement is false, and the failure mode is silence rather than
an error — which is much harder to report and much easier to ignore.

**Match the presentation to how long the information matters.** A toast is for
something the user does not need to act on. A blocked account is not that, and
using the same component for both means the important message is the one
people miss.
