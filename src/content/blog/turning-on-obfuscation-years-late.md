---
title: 'Turning On Obfuscation, Years Late'
description: 'Enabling R8 is one line. The other two hundred are the rules that stop it from breaking your app.'
publishedAt: 2027-08-09
draft: true
tags: ['android', 'proguard', 'build']
---

The app shipped for years with `minifyEnabled false`. Release builds went out
unobfuscated, with every class and field name intact, nothing stripped.

Turning it on is one line:

```gradle
release {
    minifyEnabled true
    shrinkResources true
}
```

The diff for that change was 206 lines in the ProGuard rules file.

## Why it breaks things

R8 removes what it thinks is unused and renames what it keeps. It works out
what is used by following references in the bytecode — which is sound, and
blind to anything that finds a class by name at runtime.

Every one of these is that:

**Gson models.** Serialisation maps JSON keys to field names. Rename the
fields and every field silently comes back null. Models with
`@SerializedName` survive; models relying on the field name matching the JSON
key do not, and this codebase had plenty of the second kind.

**JNI bindings.** Native code looks up methods by their exact name. Rename one
and it fails at runtime, in C++, with an error that tells you very little.

**Anything reflective.** WorkManager instantiating a worker by class name,
view binding libraries, database helpers, media libraries with internal
reflection — they all look up names that R8 has quietly changed.

So the rules file is a list of exceptions, and it grew in the shape of that
list: keep rules for the native config class, keep rules for Gson models
across request, response, database and preference packages, plus a long tail of
safety-net rules for third-party libraries.

## The honest part about that long tail

Some of those rules are precise, from an actual failure I traced. Others are
defensive — added because a library is known to use reflection and I would
rather keep too much than debug an obfuscated crash from a dependency I do not
control.

The defensive ones are a real cost. Every over-broad keep rule is size R8
could have saved, and I cannot tell you which of them are load-bearing. That
is the uncomfortable truth of retrofitting minification into an old codebase:
you end up with a rules file nobody fully understands, including the person who
wrote it.

Doing it from day one avoids this entirely, because each rule gets added
alongside the code that needs it, by someone who knows why. Retrofitting means
reconstructing that knowledge from crashes.

## Testing something that only exists in release

The failure mode that makes this work slow: **obfuscation only happens in
release builds.** Your debug build, your unit tests, your instrumentation
tests — none of them exercise the thing you changed.

So the loop is: build release, install, walk through the app by hand, hit a
`ClassNotFoundException` or a screen of empty fields, work out which class,
add a rule, rebuild. Release builds are slow because R8 is doing real work.

And the crashes are cryptic by design. A stack trace full of `a.b.c` classes is
what obfuscation is for. You need the mapping file to read it, which means
having kept the right mapping file for the exact build you are debugging, which
is its own discipline.

It also means the failure surface is "everything an unusual code path touches".
A screen visited rarely, an error dialog that only appears on a specific
response code — anything a manual sweep misses ships broken. That is the
strongest argument I know for enabling minification early, when the app is
small enough to walk through in an afternoon.

## Was it worth it

Smaller APK, from both the code shrinking and the resource shrinking. That part
is measurable and modest.

The other reason is that shipping an app with full symbol names makes it
trivially readable. Anyone can unzip the APK, decompile it, and read your class
names, your method names, your API structure. Obfuscation does not make that
impossible — a determined person will still work it out — but it moves the
effort from minutes to hours, which is enough to deter casual inspection.

For an app handling client contacts and commission data, that is worth having.
It should have been there from the first release, and the cost of adding it
later was entirely in that 206-line rules file.

## What I took from it

**Build configuration has a compounding cost of delay.** Enabling R8 on a new
project is free. On a four-year-old codebase it is a week of hunting runtime
crashes. Nothing about the change got harder — the app got bigger around it.

**Reflection is invisible to static analysis, and that is the whole problem.**
Every keep rule marks a place where the code does something the compiler
cannot see. The rules file is, in a sense, a catalogue of your codebase's
dynamic behaviour.

**If a config change can only be tested in release, budget for a manual
sweep.** No test suite protects you here. The work is a person walking through
the app, and the coverage is exactly as good as that person's patience.
