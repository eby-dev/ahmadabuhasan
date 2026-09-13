---
title: 'Decrypting Fields You Did Not Ask For'
description: 'Personal data started arriving encrypted, field by field. The cleanest place to handle it turned out to be inside the JSON parser.'
publishedAt: 2027-08-18
draft: true
tags: ['android', 'kotlin', 'security']
---

Indonesia's personal data protection rules pushed a change through the whole
platform: certain fields — tax numbers, identity details — stopped travelling
as plain text. The server now sends an envelope instead of a string.

The envelope is a small JSON object: an AES key encrypted with the client's
RSA public key, an IV, an auth tag, and the ciphertext. Decrypt the key with
RSA-OAEP, then the data with AES-GCM.

The interesting question was not the cryptography. It was where to put it.

## Three places it could go

**At every call site.** Wherever a protected field is read, decrypt it. Honest
and explicit, and it means every screen that touches one of these fields needs
to know it is encrypted. Miss one and you render ciphertext to a user.

**In each model.** A custom getter per protected field. Better, but the
knowledge is still spread across every model, and adding a newly-protected
field means finding and editing each one.

**In the JSON layer.** A Gson type adapter that inspects strings as they are
deserialised, and decrypts the ones that look like an envelope:

```kotlin
// registered once, for every String the parser ever produces
class DecryptingStringAdapter : JsonDeserializer<String?> {
    override fun deserialize(json: JsonElement, ...): String? =
        decryptIfEnvelope(json.asString)
}
```

That is the one I took. Models stay unchanged, screens stay unchanged, and a
field that becomes protected tomorrow needs no client change at all.

The trade is that decryption becomes invisible. Someone reading the model sees
a `String` and has no indication that the value passed through a crypto
routine. That is genuinely a downside — the behaviour lives in a type adapter
registered far from the code it affects.

I took it anyway because the alternative failure is worse. A missed call site
means personal data rendered as ciphertext in front of a user, or worse, logged
somewhere as an envelope that nobody notices. Centralising means the failure
mode is consistent rather than scattered.

## Never failing loudly

The first version let decryption exceptions propagate. That is the correct
instinct for crypto — a failure to decrypt means something is wrong, and
silence hides it.

In a JSON deserialiser it means something different: **one bad field takes down
the entire parse**, and the user gets an empty screen instead of the eight
fields that decrypted fine. Same shape as [a missing field emptying the whole
object](/blog/one-missing-field-empties-the-object/), with a worse blast
radius, because it happens at the parser level.

```kotlin
return try {
    decryptIfEnvelope(json.asString)
} catch (_: Exception) {
    null   // one bad field must not cost the whole response
}
```

A field that cannot be decrypted becomes null. The screen shows a blank where
that value would be, and everything else renders.

I am not fully comfortable with the bare `catch`. It swallows a key mismatch,
a corrupted envelope, and a genuine bug equally, and this is a case where the
right answer is almost certainly to count the failures and report them — the
same gap I keep finding in my own error handling.

## The key, and where it must not be

The client needs an RSA private key to decrypt. Which means the app ships with
one, and everything about that is uncomfortable.

It is not in the repository. It arrives at build time, and the mechanism
changed once:

The first version had CI write the key from an environment variable into the
assets folder via a shell script. Works, but the key passes through a variable
that gets expanded in build logs if anyone adds a `set -x`, and the script
needed maintenance of its own.

The second version uses GitLab Secure Files — files stored by the platform,
downloaded into the build, copied into assets. No shell handling, no variable
expansion, and rotating a key is a platform operation rather than a code
change.

The passphrase that unlocks the key is held in the native layer, exposed
through a JNI call:

```kotlin
external fun passphrase(): String   // implemented in the native layer
```

Not because native code is secure — anyone can pull strings out of a `.so` —
but because it raises the effort past grepping the APK for a string. Layered
with R8 obfuscation, it is a speed bump rather than a wall, and worth being
clear-eyed about.

The honest summary: **a key shipped in a client is a key you have given away,
and every measure around it buys time rather than secrecy.** What actually
limits the damage is that this key only decrypts data the user was already
authorised to see.

## What I took from it

**Cross-cutting transformations belong in one layer, and you pay for it in
visibility.** Putting decryption in the parser means nobody can forget it and
nobody can see it. That trade is right when the cost of forgetting is high, and
it needs to be written down somewhere a reader will find.

**Crypto that runs inside a parser has to fail like a parser.** The instinct to
fail loudly is right in isolation and wrong in context — one field should not
cost you the response.

**Client-side keys buy time, not secrecy.** Worth doing, worth layering, and
worth stating plainly so nobody downstream mistakes it for a guarantee.
