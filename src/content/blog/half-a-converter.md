---
title: 'Half a Converter'
description: 'Saving your profile silently wiped the fields that mattered most. The cause was a translator that only worked in one direction.'
publishedAt: 2026-10-09
draft: true
tags: ['android', 'kotlin', 'json']
---

Edit your profile in the staff app, change your phone number, save. The screen
returns, your new number is there, and your tax ID and ID card number are now
blank.

Not on the server — reopen the app and they are back. Blank on the screen you
were just looking at, for as long as you stayed on it.

## A one-way translator

The app decrypts certain personal fields as they arrive. Rather than
decrypting at every call site, a Gson type adapter does it during parsing, so
models and screens never know it happened. I have [written about that
design](/blog/decrypting-fields-you-did-not-ask-for/) — it is a good trade,
and this is the bill for it.

The adapter is a `JsonDeserializer`. Only a deserializer. There is no matching
`JsonSerializer`, because nothing in the app needed to write those fields
back — they are displayed, not sent.

That holds right up until something serialises the object for a reason that
has nothing to do with the network.

## Passing an object between screens

The edit screen handed the updated profile back like this:

```kotlin
val intent = Intent()
intent.putExtra(MEMBER, Gson().toJson(member))   // ← here
setResult(RESULT_OK, intent)
```

A perfectly normal pattern: serialise to JSON, pass through the intent, parse
on the other side.

Except `Gson().toJson(member)` runs the serialiser — the half that does not
exist. Gson falls back to its default for those fields, which does not produce
the envelope format the deserialiser expects. The receiving screen parses the
result, the adapter looks for an envelope, finds something else, and yields
nothing.

Decrypt, then re-encode with a converter that only knows how to decrypt. The
values survive the first direction and evaporate on the way back.

Nothing throws. Both halves behave exactly as written.

## Two fixes, and only one of them is the fix

The visible repair is to stop passing the object:

```kotlin
// RESULT_OK alone is the signal; the profile screen reloads from the API.
// Passing the Member as JSON breaks the PII fields, whose decrypting
// adapter has no serializer half.
setResult(RESULT_OK)
```

The result code says _something changed_. The profile screen fetches the
profile again. One extra request, on a screen the user visits rarely, and the
data is now guaranteed to match the server rather than a copy that took an
undocumented detour through two converters.

I prefer this to adding the missing serialiser, and not only because it is
less code. **Passing a model between screens as JSON is a copy that can drift.**
Re-fetching after a change is a little slower and cannot be subtly wrong.

The second fix is smaller and not really a fix:

```kotlin
// non-primitive elements reach this adapter only on an unexpected
// serialisation cycle; return null instead of throwing.
```

It stops a crash, and the crash was a symptom. I kept it because a parser
should not bring down a screen over one bad field — but it makes the failure
quieter, and quiet failures are what produced this bug. A logged counter would
have told us the adapter was being handed things it did not expect. I did not
add one. That is the honest gap here, and the [same gap I keep
finding](/blog/the-date-that-lost-its-seconds/) in my own error handling.

## What I took from it

**An asymmetric converter is a trap with a delay on it.** Writing only the
half you need is reasonable, and the missing half has no callers on the day
you write it. It waits for someone to serialise the object for an unrelated
reason, and the failure appears nowhere near the adapter.

**If you transform on read, you own the write.** Either implement both
directions or make the one-way nature impossible to trip over. A
deserialiser-only adapter registered globally is an invitation, because
`toJson` is right there and looks harmless.

**Prefer re-fetching over passing state between screens.** A serialised copy
is a second source of truth with a short lifespan and no owner. Here it went
through two converters, and one of them was missing.
