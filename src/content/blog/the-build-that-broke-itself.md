---
title: 'The Build That Broke Itself'
description: 'Nobody changed the pipeline. It failed anyway, because it was told to fetch the newest version of everything every time it ran.'
publishedAt: 2027-09-11
draft: true
tags: ['ci-cd', 'android', 'fastlane']
---

A release pipeline that had worked for months started failing. No commit to
the CI config, no change to the build scripts, no new dependency in the app.

The error was a Ruby syntax feature the CI image did not support. Our
deployment tooling runs on Ruby 2.7; a plugin had released a version requiring
3.2, and the pipeline downloaded it the next time it ran.

## The line that did it

```yaml
script:
  - bundle update # ← this
  - bundle exec fastlane deployFirebase
```

`bundle update` ignores the lockfile and fetches the newest version of every
gem that satisfies the constraints. The lockfile exists precisely to pin what
was tested, and this line asked the pipeline to throw it away on every run.

Which means the build's dependencies were whatever had been published to
RubyGems in the meantime. Not a decision anyone made — a decision made
continuously, by other people's release schedules.

The constraints were loose enough to allow almost anything:

```ruby
gem "fastlane"   # any version
```

So the pipeline was free to pick up a new major version of the deployment
tool, and the plugins were free to pick up versions requiring a newer Ruby
than the image had.

## Pinning

Two changes. Constraints that express what we actually support:

```ruby
# CI image is Ruby 2.7; cap plugins that moved to 3.2
gem "fastlane", ">= 2.220", "< 3.0"
```

```ruby
gem "fastlane-plugin-increment_version_code", "~> 0.4"
gem "fastlane-plugin-firebase_app_distribution", "< 1.0"
```

And removing the update:

```yaml
script:
  - bundle exec fastlane deployFirebase # uses the lockfile
```

The upper bounds are the part worth explaining. A lower bound says what you
need. An upper bound says what you have tested, and for a build pipeline that
is the more useful claim — a new major version of your deployment tool is not
something you want arriving unannounced during a release.

The Ruby cap on the plugins is specifically a statement about the environment:
the image has 2.7, so anything needing more is out. That constraint would be
unnecessary if the image were newer, and writing it down means the next person
understands why the version is held back rather than assuming it is neglect.

## Why it was written that way

`bundle update` in CI usually comes from a real frustration: a stale lockfile
causing a failure that goes away when you update, so the update gets added to
the script and the problem stops. It is a fix that works, and it converts a
loud occasional failure into a silent permanent risk.

The same pattern shows up in other ecosystems — `npm install` versus `npm ci`,
`go get -u` in a build step, unpinned base images in a Dockerfile. Each one
trades reproducibility for the convenience of never dealing with a lockfile
conflict.

What makes it especially bad in a deployment pipeline is when the failure
arrives. Not while you are working on the build — it passes then, because
nothing has been published since the last run. It arrives when you are trying
to ship, which is the moment you have the least patience for an unrelated
problem, and it looks like your change broke something.

## The other half: a build should be quiet

The same change removed `--verbose` from the fastlane command and turned off a
plugin's debug mode.

That sounds cosmetic. It is not. Logs are how you diagnose a failing build, and
a log where everything is printed is a log where nothing stands out. Verbose
output in a pipeline also has a habit of printing more than you intended — and
with keys and credentials moving through CI, that is a real concern rather than
a tidiness one.

Verbose mode is a debugging tool. Leaving it on permanently means giving up the
signal it was meant to provide.

## What I took from it

**A pipeline that fetches the latest of anything is not reproducible.** The
same commit built twice can produce different results, and the difference is
whatever the internet published in between. Lockfiles exist for this and are
worth defending against convenience.

**Upper bounds encode what you tested.** Lower bounds are about features; upper
bounds are about the environment you actually verified. In infrastructure, the
second matters more.

**Constraints deserve a comment.** `"< 1.0"` looks arbitrary and reads like
someone being cautious. `# capped: 1.x requires Ruby 3.2, image has 2.7`
tells the next person exactly what would let them raise it — which is the
difference between a pin that gets revisited and one that becomes folklore.
