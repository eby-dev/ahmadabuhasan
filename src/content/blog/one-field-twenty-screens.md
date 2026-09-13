---
title: 'One Field, Twenty Screens'
description: 'The backend added a single field to its responses. Consuming it took a week and touched twenty-odd files — and the reason was in our code, not theirs.'
publishedAt: 2026-11-17
draft: true
tags: ['android', 'architecture', 'json']
---

The product need was small. Agents contact each other through the app, and the
backend wanted to route those conversations through a verified number instead
of the agent's personal one. So the API responses grew one field:
`DestinationNumber`.

On the mobile side, use the new number when it is present, fall back to the
old one when it is not. An afternoon of work, I assumed.

It took most of a week and touched a little over twenty files.

## Where the week went

The agent contact button appears on the primary listing detail, the primary
listing tab, the secondary listing detail, a second secondary detail screen
that had been rewritten but not replaced, the open house screen, the open
house grand variant, the bookmark list, the contact list, the favourites
list, the buyer book, the property search inside the buyer book, the home
screen, the agent profile, the AI assistant screen, and the marketing
materials screen.

Every one of those parsed its own response. Every one built the contact intent
itself. So `DestinationNumber` had to be threaded through each of them
separately, with its own null check and its own fallback, written fifteen-odd
times.

Two weeks later the backend split the field in two — `WAPhone` and `WAPhone2`,
for agents with a second registered number. I did the same tour again.

## The actual problem

None of the individual code was bad. Each screen had a sensible reason to
parse the fields it needed, and when you are adding one screen, hand-parsing
the three fields it displays is genuinely simpler than routing it through a
shared model.

The cost does not land on the screen that makes that choice. It lands, years
later, on whoever has to change something every screen shares.

That is what makes this kind of duplication hard to catch. It is not visible
in code review — the diff for any one screen looks fine. It is not visible in
testing. It shows up exactly once, as a task that should be an afternoon and
is a week, and by then the decision that caused it was made by people who left
long ago.

There is a smell I now look for. When a task is described as "add the field to
all the places", the interesting number is _how many places_, and whether
anyone can list them from memory. Nobody could list these. I found the last
three by grepping for the contact intent and checking each hit.

## Why I did not fix it properly

The right fix is one contact model, parsed once, used everywhere. I did not do
that, and I still think that was correct.

Consolidating would have meant touching twenty screens in a way that changes
their behaviour, in an app thousands of people use for their actual job, to
support a feature the business wanted that month. The version I shipped
touches twenty screens in a way that only adds a fallback. If I got one wrong,
that screen keeps using the old number — which is what it did yesterday.

The refactor is unbounded and the payoff is invisible until the _next_ time
someone adds a field. The threading is bounded and ships this week.

What I regret is not writing that down anywhere. The next person to add a
contact field will rediscover the same twenty screens and make the same call
under the same deadline, and the only artifact of my week is a commit log that
says `add DestinationNumber` twenty times.

## What I took from it

**Duplication is a loan, and the interest is paid by someone else.** Hand-
parsing in one screen costs nothing today. The bill arrives when a shared
concept changes, and it goes to whoever happens to be holding that ticket.

**"Add a field" is not a size estimate.** It is a description of the change,
not its cost. The cost is how many places independently know the shape of that
data, and that number is usually unknown until someone grep for it. I now do
the grep before giving an estimate.

**Shipping the tedious version is often right.** The refactor is more
satisfying and more dangerous. In an app with thousands of daily users, a
change that cannot break what already works beats a better design that might —
as long as you write down what you found, so the next person can make the call
with better information than you had.
