---
title: 'The Photo Picker That Kept Moving'
description: 'Letting users attach a photo took four rewrites — not because the code was wrong, but because the ground it stood on kept shifting.'
publishedAt: 2026-10-02
draft: true
tags: ['android', 'kotlin', 'play-store']
---

An internal staff app lets people attach photos to requests — a receipt for an
expense claim, a document for a leave request. Pick an image, upload it.

This is the most ordinary feature in mobile development. It took four separate
changes over two weeks, and none of them were because the original code was
broken.

## Round one: the permission you are no longer allowed to ask for

The app used a picker library that reads the device's media store, which needs
a permission to do. That was the standard approach for years.

Google Play's media permissions policy changed that. Broad media access —
`READ_MEDIA_IMAGES` and friends — now has to be justified, and "the user wants
to attach one photo" is not a justification. The platform provides
`PickVisualMedia`, a system picker that returns exactly the file the user
chose and needs **no permission at all**, because the user's selection _is_
the grant.

So the picker was rewritten around it:

```kotlin
// Android 13+: system picker, no permission needed
registerForActivityResult(PickVisualMedia()) { uri -> handle(uri) }
```

But the app still supports older versions, where `PickVisualMedia` does not
exist and the old library still does. So both paths stay, gated by SDK
version, and the manifest gets careful:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                 android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"
                 tools:node="remove" />
```

The `maxSdkVersion` matters as much as the permission itself. Without it the
permission is declared for every version, including the ones where Play's
policy applies — and Play reads your manifest, not your code.

Two code paths for one feature, and that is the correct answer rather than a
compromise. A single path means either dropping older devices or keeping a
permission you cannot justify.

## Round two: the photos from iPhones

With the new picker working, uploads started failing for some users.

HEIC. Every modern iPhone shoots in it by default, and a photo shared to an
Android phone arrives in that format. The server accepts JPG and PNG.

Android can decode HEIC from API 28, so conversion is possible — but only via
`ImageDecoder`, and only on devices new enough:

```kotlin
val bitmap = ImageDecoder.decodeBitmap(source)
bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
```

Which raised a question with no clean answer: what do you do on an older
device that cannot decode the file at all? There is no conversion to perform
and no way to upload it. The honest option is an error message naming the
actual problem — this format is not supported on this device — rather than a
generic upload failure that sends the user to support.

## Round three: everything else that is not JPG

HEIC was not the only format. WebP arrives from messaging apps. AVIF is
starting to appear. GIF and BMP still exist.

Converting HEIC specifically had solved one symptom of a general problem, so
the rule was inverted: instead of listing what to convert, convert everything
that is not already accepted.

```kotlin
// server takes JPG and PNG only; everything else becomes JPEG.
// PNG is passed through untouched to keep transparency.
```

Keeping PNG intact matters — re-encoding it to JPEG would flatten
transparency onto black, and a screenshot with a transparent region would come
out visibly wrong.

## Round four: the ANR

Then requests that allow up to ten attachments started freezing the app.

Decoding and re-encoding an image is slow. Ten of them, in sequence, on the
main thread, is several seconds of frozen UI — long enough for Android to
consider the app unresponsive.

Obvious in hindsight. It was not obvious while writing it, because the
conversion had been added to an existing callback that was already on the main
thread, and one small photo converts fast enough that nothing looks wrong
during testing.

```kotlin
// up to 10 photos per request; converting them inline blocks the UI
lifecycleScope.launch(Dispatchers.IO) {
    val converted = uris.map { convertIfNeeded(it) }
    withContext(Dispatchers.Main) { onReady(converted) }
}
```

Plus a loading overlay, because moving work off the main thread means the user
now waits with no feedback unless you give them some.

## What I took from it

**Platform policy is a functional requirement that arrives after you ship.**
Nothing about the original picker was wrong when it was written. The rules
changed, and rules are not a technical constraint you can design around in
advance — they are a deadline that appears in your inbox.

**"Users upload photos" hides a format problem.** The set of image formats a
phone can produce is larger than the set most servers accept, and it grows.
Whatever the server takes, something on the client has to normalise to it —
that is not an edge case, it is the feature.

**Work that is fine once is not fine ten times.** Single-item testing passes
for anything. The bug lives in the bulk path, which is the one you exercise
least and users exercise most.
