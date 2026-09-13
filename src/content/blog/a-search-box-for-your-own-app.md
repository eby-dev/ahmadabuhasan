---
title: 'A Search Box for Your Own App'
description: 'When an app grows past fifty features, people stop finding them. The fix needed no backend at all.'
publishedAt: 2027-04-11
draft: true
tags: ['android', 'kotlin', 'ux']
---

The app has more than fifty distinct features. Listings, contacts, a forum,
training classes, a mortgage simulator, reports, agendas, business tools. All
of it lives behind a menu that has been reorganised several times as the
product grew.

Agents kept asking support where things were. Not how to use them — where they
*were*. The features existed and were working, and people could not find the
door.

So we added a search box for the app itself. Type "KPR" and get the mortgage
simulator. Type "jadwal" and get the agenda screen.

## No backend

The whole thing is local. A registry of 52 entries compiled into the app, no
new endpoint, no network call while typing:

```kotlin
data class FeatureEntry(
    val id: String,
    val title: String,
    val keywords: List<String>,
    val category: String,
    val visible: () -> Boolean,
    val navigate: (Context) -> Unit,
)
```

That was a deliberate choice and I think it is the right default for this kind
of feature. The data is small, changes only when the app changes, and searching
it server-side would add latency, an offline failure mode, and an endpoint to
maintain — to search a list that ships inside the binary anyway.

Ranking is a plain tier system: exact title match first, then prefix, then
contains, then a keyword hit, then category. Alphabetical inside a tier, with
the entry id as the final tiebreak so results never reorder between identical
searches. Matching is case-insensitive and diacritic-insensitive using
`Locale.ROOT`, which matters in a bilingual app where the same word gets typed
several ways.

Input is debounced 300ms, with no loading spinner. There is nothing to wait
for — showing a spinner for a local list filter would be inventing latency to
look busy.

## The part that was actually hard

Not the search. The navigation.

The app had accumulated several ways to open a screen. Most go through the
existing menu dispatcher. Some have no case in that dispatcher and need a
direct `Intent`. One is not a screen at all — the mortgage simulator is a tab
inside another screen, so "navigating" to it means opening the parent and
switching tabs.

So `navigate` is a lambda per entry rather than a route string. Fifty-two
entries, each carrying its own knowledge of how to get there. Not elegant, and
honest about a codebase where navigation was never unified. A routing
abstraction would have meant touching every screen in the app to support a
search box, which is the tail wagging the dog.

The second problem was visibility. Features appear conditionally — by role, by
account status, by whether a module is enabled for that office. There was an
iOS spec listing which features should show for whom, and it was tempting to
encode that table directly.

I did not, and this is the decision I would defend hardest:

```kotlin
// gate on the real menu condition, not the spec table —
// a feature whose menu row is hidden must not be reachable from search
visible = { AppMenu.canShowMortgageSimulator(member) }
```

Each entry calls the same condition the menu itself uses. If the two ever
disagree, they disagree in the direction of the real one.

Encoding the spec would have created a second source of truth for
authorisation, drifting quietly, in a search box — the last place anyone would
look for a permissions bug. Search results are a way to reach a screen, and
anything that can reach a screen is part of your access control whether you
designed it that way or not.

## Cross-platform, same registry

iOS was building the same feature, and the entry list is a shared contract —
same ids, same categories, same ordering rules. Two implementations, one
agreed vocabulary.

What is deliberately not shared is the visibility gate. Each platform binds to
its own real menu conditions, because that is what "the truth" means on each
side. Sharing the list of *what exists* is useful. Sharing the judgement about
*who may see it* would have meant both platforms trusting a document instead of
their own code.

## What I took from it

**Discoverability is a feature, and it is nobody's ticket.** Every feature had
a spec. Whether anyone could find it afterwards belonged to no team. The
problem only becomes visible in aggregate, long after each individual decision
looked fine.

**A second source of truth for permissions is a security bug with a delay
fuse.** The spec table and the menu conditions agree today. They would not
have agreed in a year, and the failure would have shown up as an unrelated
screen being reachable from an unexpected place.

**Local beats remote when the data ships with the binary.** No endpoint, no
latency, no offline case, nothing to deploy. The instinct to put search on a
server is strong enough that it is worth stating the counter-case out loud.
