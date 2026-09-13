---
title: 'One Missing Field Empties the Whole Object'
description: 'A photo was missing one URL size. The result was not a missing photo — it was a contact with no name, no office, and no ID.'
publishedAt: 2027-01-25
draft: true
tags: ['android', 'json', 'error-handling']
---

An agent's photo stopped appearing in one list. So did their name, their
office, and their ID. The row rendered, but nearly empty.

The API response had all of it. The name was right there.

## Sequential assignment inside one try block

The parsing code was the shape you write without thinking about it:

```java
try {
    this.setUrl(json.getString(PARAM_ORIGINAL));
    this.setSmallUrl(json.getString(PARAM_SMALL));
    this.setMediumUrl(json.getString(PARAM_MEDIUM));
} catch (JSONException e) {
    e.printStackTrace();
}
```

Agent photos are served in two sizes, small and medium. No original. Listing
photos have all three, and this model parsed both.

So line one throws. The `catch` swallows it, and lines two and three never
run. The object comes back with no URLs at all — not just the missing one.

The same pattern sat in the office model, where some endpoints return an
office without an ID or name. First missing field, and every assignment after
it is skipped.

**The blast radius of a missing field is not that field. It is every field
parsed after it in the same block.** Which fields those are depends on the
order somebody happened to write them in, and that is why the failure looked
so arbitrary from the outside: a missing image size wiped out a name.

## Guarding each assignment

```java
// guard each url, agent photo only carries Small/Medium and the missing
// Original skipped the rest
if (StringUtil.isStringParamValid(json, PARAM_ORIGINAL)) {
    this.setUrl(json.getString(PARAM_ORIGINAL));
}
if (StringUtil.isStringParamValid(json, PARAM_SMALL)) {
    this.setSmallUrl(json.getString(PARAM_SMALL));
}
```

Each field is now independent. A missing original means no original, and the
other two sizes still load.

Note what `isStringParamValid` has to check: key present, value not JSON
`null`, value not the *string* `"null"`, value not empty. That last pair is
not paranoia — a backend that builds JSON by string concatenation will hand
you `"null"` as four characters, and `has()` returns true for it. I have
[written about that one before](/blog/kotlin-null-string-migration/) from the
other direction, when the app was the one sending it.

## The part I keep going back and forth on

This is defensive parsing, and defensive parsing hides schema problems. The
app now renders a photo object with no URLs and an office with no name without
complaint. If the backend starts omitting names by accident, nothing tells us.

What pushed me to it anyway is that the app is not the system of record and
cannot fix bad data. It has one useful job when a field is missing: show
everything else. An agent whose photo fails to load is a small problem. An
agent whose name vanishes because their photo failed is a bug report.

Where I think the balance actually sits: guard the fields, but do not guard
silently forever. The `catch` that swallowed the exception and printed a stack
trace is the real villain of this story — it turned a data problem into an
invisible one for as long as nobody was watching logcat. Guarded assignment
plus a logged count of what was missing would have told us within a day.

I shipped the guards. I did not add the counting, and that is the honest gap
in this fix.

## What I took from it

**A try block is a failure unit.** Everything inside it shares one fate.
Grouping unrelated assignments into one block means the first failure decides
the outcome for all of them, and the grouping is usually accidental — they are
together because they were typed together.

**`catch (e) { printStackTrace() }` is not error handling.** It is a decision
to continue with an object in an unknown state, made silently, and it is the
default thing the IDE offers you. Every one of these bugs was that autocomplete
accepted years ago.

**Optional fields need to be optional in the parser, not just in the docs.**
"Agent photos have no original size" was known and true. It just was not
expressed anywhere in the code that read them.
