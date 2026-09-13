---
title: 'The Date That Lost Its Seconds'
description: 'Same API, same field, two formats. The parser was right and the data was not, and only one of those can be fixed from the app.'
publishedAt: 2027-07-13
draft: true
tags: ['android', 'java', 'api-design']
---

A creation date rendered as a raw timestamp on one screen and correctly on
every other. Same field, same endpoint family, same parsing helper.

The difference was in the data. Most endpoints send
`2026-08-28 15:35:12`. A few send `2026-08-28 15:35`.

The parser was told to expect `yyyy-MM-dd HH:mm:ss`. Given a string with no
seconds it throws, the helper catches it, and the original string falls
through to the UI unchanged.

## Fixing it in the app

The correct fix is on the backend: one format, everywhere. That was raised. It
is also a change across several services with unknown consumers, and the
rendering was wrong in production now.

So the app learned to cope:

```java
// BE is inconsistent, some fields arrive without seconds
// ("2026-08-28 15:35"); retry with the pattern trimmed.
String trimmedFormat = trimSecondsPattern(formatBefore);
if (trimmedFormat != null) {
    try {
        SimpleDateFormat noSecond = new SimpleDateFormat(trimmedFormat, ID_LOCALE);
        return output.format(noSecond.parse(date));
    } catch (ParseException e3) {
        e3.printStackTrace();
    }
}
```

With a helper that only does something when there is something to do:

```java
// returns null if the pattern has no seconds to trim
private static String trimSecondsPattern(String pattern) {
    if (pattern == null || !pattern.endsWith(":ss")) return null;
    return pattern.substring(0, pattern.length() - 3);
}
```

The fallback is narrow on purpose. It does not attempt a list of formats or
guess at the input. It handles exactly the one deviation that exists, and if a
third format ever appears, it fails the same way it does today rather than
silently mis-parsing something.

That narrowness is the only reason I am comfortable with it. A permissive date
parser is a machine for turning a data problem into a subtly wrong date
nobody notices — and a date that is wrong by an hour is much worse than one
that fails to render, because the second gets reported and the first gets
believed.

## The comment is the fix

The line I care about most is the comment. Without it, the trimming logic is
inexplicable — a future reader sees a parser that mangles its own pattern and
retries, with no way to tell whether that is a workaround, a misunderstanding,
or something load-bearing.

With it, the next person knows this is a workaround for a known upstream
inconsistency, and knows what would let them delete it.

**A workaround without a written reason becomes permanent, because nobody can
prove it is safe to remove.** That is how codebases fill with code everyone is
afraid to touch.

## The thing I would do differently

The fallback works and logs nothing. There is no count of how often it fires,
which endpoints send short dates, or whether it is still needed.

If the backend fixed this tomorrow, nobody would know, and the workaround
would stay for years — carried forward through refactors, wondered about,
never removed.

A counter would have cost one line and turned "we think some endpoints do
this" into a fact with a number attached. That number is also what makes the
backend conversation concrete: *this fires four thousand times a day on these
three endpoints* is a different discussion from *we noticed some inconsistent
dates*.

Same gap I had in the [JSON parsing
guards](/blog/one-missing-field-empties-the-object/). Twice now I have shipped
a tolerant parser without instrumenting it, which suggests it is not an
oversight so much as a habit.

## What I took from it

**Tolerance has to be specific.** A parser that accepts one known deviation is
a workaround. A parser that accepts anything is a guess, and its failures are
silent and plausible.

**Client-side compatibility code is a loan against the backend fixing it.**
Sometimes the right call — production is broken now and a coordinated change
takes weeks. It is only reasonable if somebody remembers the debt exists.

**If you work around something, count it.** The count tells you whether it is
still happening, gives the upstream team a number instead of an anecdote, and
is the only thing that will ever let someone delete the workaround with
confidence.
