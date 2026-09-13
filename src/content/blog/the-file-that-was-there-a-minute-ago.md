---
title: 'The File That Was There a Minute Ago'
description: 'A bug reporter kept failing to attach its screenshot. The file was written successfully — and gone by the time we needed it.'
publishedAt: 2026-10-12
draft: true
tags: ['android', 'kotlin', 'storage']
---

The app has a built-in bug reporter. You hit a problem, trigger it, and it
takes a screenshot, lets you type what went wrong, and files a ticket with the
screenshot attached.

A slice of those tickets kept arriving with no attachment. The reason was
plain enough:

```
java.io.FileNotFoundException: .../cache/Screenhoot_1724832915: open failed: ENOENT
```

No such file. Which was strange, because the code that wrote it had returned
successfully. We had the `File` object in hand. We had just made it.

## The gap nobody thinks about

Here is the shape of the flow, and the bug is entirely in the shape:

1. User triggers the reporter. Screenshot is captured and written to disk.
2. The `File` is held in memory while the report screen is open.
3. User types a description. This takes thirty seconds, or two minutes, or
   they get a phone call and come back later.
4. User hits Send. The file is read and uploaded.

Step 3 is the problem. Between writing the file and reading it there is an
open-ended amount of real-world time — and the file was being written here:

```kotlin
val cacheDir = activity.cacheDir
val cacheFile = File(cacheDir, filename)
```

`cacheDir` is storage the OS is allowed to reclaim whenever it wants space.
That is not a failure mode; that is the documented purpose of the directory.
When the device got tight on storage while the user was still typing, Android
did exactly what it promised and deleted the file.

The `File` object in memory survived. It is only a path. The bytes it pointed
at did not.

## The fix is one directory

```kotlin
// Screenshots live in filesDir, not cacheDir: the report flow keeps the File
// while the user types, and the OS may evict cacheDir in between, making the
// upload fail with ENOENT.
val screenshotDir = File(activity.filesDir, SCREENSHOT_DIR).apply { mkdirs() }
val screenshotFile = File(screenshotDir, filename)
FileOutputStream(screenshotFile).use { outputStream ->
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
}
```

`filesDir` is never reclaimed by the system. The file stays until the app
deletes it or the user clears app data.

While I was in there I also fixed the filename. It had been a timestamp with
no extension and one-second resolution, so two screenshots taken in the same
second overwrote each other. It became
`Screenshot_yyyyMMdd_HHmmss_SSS.png`.

## The fix creates a second problem

`filesDir` is never reclaimed by the system. That is the entire point — and it
also means nothing cleans up after you. Every screenshot ever taken by the
reporter would sit on the user's device forever, for a feature they might use
twice a year.

So the cleanup had to be written by hand:

```kotlin
/** Screenshots older than this are pruned on the next takeScreenshot call. */
private const val DEFAULT_KEEP_DAYS = 1

fun pruneOldScreenshots(context: Context, keepDays: Int = DEFAULT_KEEP_DAYS) {
    try {
        val dir = File(context.filesDir, SCREENSHOT_DIR)
        if (!dir.isDirectory) return
        val cutoff = System.currentTimeMillis() - keepDays * DateUtils.DAY_IN_MILLIS
        // ... delete files older than cutoff
    } catch (e: Throwable) {
        // a failed cleanup must never block taking a screenshot
    }
}
```

Three decisions in that small function are worth saying out loud, because each
one is a bug I did not ship:

**Age-based, not delete-everything.** The reporter lets you take several
screenshots in a row before sending. Clearing the folder on every capture
would throw away shots still waiting to go out.

**Scoped to the subfolder, files only, non-recursive.** `filesDir` also holds
the datastore and background-work output. A cleanup routine pointed one level
too high is how you delete user data, and it is the kind of mistake that only
shows up in production.

**Never throws.** Cleanup is housekeeping. If it fails, the user should still
get their screenshot.

## What this changed in how I think

I used to pick `cacheDir` or `filesDir` by asking _is this file important?_ A
screenshot for a bug report does not feel important. It is generated, it is
disposable, it gets thrown away right after. `cacheDir` felt obviously right.

That is the wrong question. The right one is **how long does this file have to
survive, and who else is allowed to delete it in that window?** A file that
lives for 200 milliseconds inside one function can go anywhere. A file that
has to survive an unbounded pause while a human being composes a sentence is
not temporary, no matter how disposable its contents are.

The lifetime is set by the slowest actor in the flow. Here that actor was a
person typing, and I had handed their file to a directory whose entire job is
to delete things when convenient.
