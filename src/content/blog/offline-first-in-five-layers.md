---
title: 'Offline-First, in Five Layers Per Dataset'
description: 'Caching four lists of dropdown options took three weeks. Most of it was the same five files, four times over.'
publishedAt: 2027-06-12
draft: true
tags: ['android', 'room', 'architecture']
---

My first real feature on this app was caching. The advanced search screen has
four dropdowns — available locations, developers, price ranges, and a bundle
of static reference data — and every one of them hit the network each time the
screen opened.

That data barely changes. Agents open that screen constantly, often on mobile
data in a car, and were waiting on four requests to populate dropdowns whose
contents had been the same for months.

## The shape of one dataset

For each one, the same five pieces:

```
LocationEntity        the Room table
LocationDao           the queries
LocationRepository    save/load, and the offline-first decision
LocationMapper        entity ⇄ network model
Presenter.loadLocations()   the call site, now load instead of fetch
```

Plus registration in three places — the Room database class, the Dagger
database module, and the application component.

Then repeat for developers. Then price ranges. Then static info.

The repository holds the only interesting decision:

```kotlin
// offline-first: serve what we have, refresh behind it
suspend fun getDataOfflineFirst(): List<Location> {
    val local = dao.getAll()
    if (local.isNotEmpty()) {
        refreshInBackground()
        return mapper.toModels(local)
    }
    return getDataRemote().also { saveDataLocal(it) }
}
```

Cached data renders immediately and a refresh runs behind it. Nothing cached,
and it falls back to the network. The screen opens instantly on every visit
after the first, and works with no connection at all.

## What the repetition was telling me

Writing the second dataset felt productive. The third felt slow. By the fourth
I could do it without thinking, which is usually the point at which you should
stop and ask why you are doing it.

The honest answer, looking back, is that four near-identical copies of a
five-layer stack is a generic waiting to be written — something like
`CachedResource<Entity, Model>` handling save, load, and the offline-first
branch, with each dataset supplying only its DAO and mapper.

I did not write it. At the time I had been on the codebase for weeks and did
not trust myself to introduce an abstraction across a data layer I was still
learning. That caution was reasonable. What I would do differently is revisit
it after the fourth — by then I understood the pattern well enough, and the
fourth copy was the evidence.

There is a version of this mistake I see often: the abstraction is skipped at
copy two for good reasons, and then never reconsidered, because the reasons are
never re-examined. The decision to duplicate should have an expiry date.

## Migrations, and what they cost later

Every one of those tables lives in a Room database with a version number, and
adding tables means bumping it and writing a migration. Version 14 to 15, then
16, then 17 within a few weeks as other features added their own.

The part I did not appreciate at the start: **a cache is a schema you now have
to maintain forever.** Not just the tables — every future change to that data's
shape becomes a migration against devices in the field holding old versions.
Skip a migration and the app wipes the database or crashes on launch.

That cost never appears in the ticket. "Cache the dropdown options" sounds like
a performance task. It is really a commitment to versioned local storage, paid
by whoever touches that data for the rest of the app's life.

I still think it was correct here. The data is small, stable, and read on
nearly every session; the offline case is real, because agents are out of
coverage regularly. But "should this be cached?" deserves the follow-up "and
are we prepared to migrate it for years?" — a question I did not know to ask
at the time.

## What I took from it

**Offline-first is a decision about what you show when you have both.** The
mechanics are easy. The design is choosing to render possibly-stale data
immediately rather than waiting for fresh data — right for reference lists,
wrong for a bank balance, and the difference is entirely about what the data is
for.

**The fourth copy is the evidence, and it is on you to look at it.** Nothing in
the process flags repetition. Four tickets, four reviews, each diff reasonable
on its own.

**Adding a cache adds a schema you owe maintenance on.** The write is
one ticket. The migrations are permanent, and they land on people who were not
in the room when the caching decision was made.
