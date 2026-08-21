---
title: 'When null Becomes the Word "null"'
description: 'A Kotlin trap that surfaces while migrating an old Android app off Java — and why null-safety stops helping at the network boundary.'
publishedAt: 2026-08-18
draft: false
tags: ['android', 'kotlin', 'migration']
---

For close to two years now I have been working on one Android app that has been
in production a long time — Java at its core, MVP architecture, thousands of
people opening it every day.

One task runs quietly in the background the whole time: migrating the code to
Kotlin. Not a big project with a deadline, but instalments — one module every
few weeks, fitted around new features. It is still half done, and still going.

This is about one kind of bug I kept running into along the way. I think it is
the most characteristic Java-to-Kotlin migration bug there is, because it comes
out of the very feature meant to protect you.

## What the bug looks like

Picture a form that sends profile data to a server. After the migration to
Kotlin, the code reads roughly like this:

```kotlin
params["city_id"] = user.selectedCity?.id.toString()
params["region_id"] = user.selectedRegion?.id.toString()
```

It looks safe. There is a `?.`, so if no city has been picked yet it will not
crash.

And it does not crash. What happens is quieter: the server receives the
**string `"null"`** — four characters, n-u-l-l — and then fails to parse it as a
number.

## Why it happens

Look at where `?.` stops working:

```kotlin
user.selectedCity?.id.toString()
//               ^^^          ^^^
//               safe         NOT safe
```

`?.` only guards the `.id` call. If `selectedCity` is null, the expression
`selectedCity?.id` evaluates to `null` — and the `.toString()` that follows is
called **on that null**, not skipped.

In Kotlin, `null.toString()` is not an error. It calls the `Any?.toString()`
extension, which dutifully returns the string `"null"`.

So instead of a crash you can see, you get dirty data that travels all the way
to the server.

The fix is one operator, plus one call:

```kotlin
params["city_id"] = user.selectedCity?.id?.toString().orEmpty()
//                                       ^
//                        a second ?., and .orEmpty() at the end
```

Now null becomes an empty string rather than the word "null".

## Why it is interesting

This bug cannot happen in Java.

In Java, `user.getSelectedCity().getId()` on a null object throws a
`NullPointerException` immediately. Noisy, but honest — you know something is
wrong, and you know which line.

Kotlin offers `?.` so you do not have to write nested null checks. But use the
operator only halfway and what you get is not safety — just a quieter failure.
A crash turns into corrupted data, and corrupted data is far more expensive to
find.

The awkward part: this bug never shows up on the happy path. As long as users
fill in every field, everything is fine. It only appears when an optional field
is skipped — which is exactly the case that gets tested least.

## Two things I took from this migration

**Null-safety is a property of system boundaries, not of a language.** Kotlin
guards what happens inside its own code. What leaves over the network is just
strings — and out there `"null"`, `""`, and sending nothing at all are three
very different things to a server. The compiler cannot help you at that border.

**Incremental migration is right, but do not make it mechanical.** For every
module I moved, I re-read how the data flowed rather than only translating the
syntax. The bug above sails straight through if you change `getId()` to `?.id`
and call it done.

And one decision I am glad about: **I left the architecture alone.** MVP stayed
MVP; only the language moved. Stacking two large changes at once in an app
people use daily makes every bug hard to trace — is it the language, or the
architecture? One change at a time.
