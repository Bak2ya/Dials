# Dials Security Notes

Dials is designed as a local-first viewer: the public GitHub Pages deployment contains the viewer, while operational `.dials` files are distributed separately and are not hosted with the app.

## Content Security Policy

The document applies a restrictive CSP through a `<meta http-equiv="Content-Security-Policy">` tag because GitHub Pages does not expose project-controlled response headers. The current policy intentionally allows only the same-origin app resources required by Dials, plus `data:` images used by the existing CSS texture. Page-level external network connections are disabled with `connect-src 'none'`.

The early theme initializer is kept in the same-origin `theme-init.js` file so `script-src 'self'` does not need `unsafe-inline`.

## Encrypted package fingerprint and unlock backoff

Dials derives a SHA-256 fingerprint from the encrypted package wrapper fields (`format`, `formatVersion`, KDF name/salt/iterations, cipher name/nonce/ciphertext). This makes the identity independent of the filename and JSON whitespace while changing when the encrypted package itself changes. The password and decrypted contacts are not included.

Browser-local failure policy:

- failures 1–2: immediate retry
- failure 3: warning that the next failure will incur a 10-second delay
- failure 4: 10 seconds
- failure 5: 30 seconds
- failure 6: 1 minute
- failure 7: 5 minutes
- failures 8+: 15 minutes
- successful unlock: clear that fingerprint's failure state

The failure count and `retryAt` timestamp are stored in IndexedDB for the current browser only. Renaming the same file does not reset the record. Different browsers, profiles, devices, private-browsing stores, or cleared site data do not share the record.

Cross-browser/device synchronization was explicitly considered and rejected because it would require a central shared service, add a network dependency, and conflict with Dials' local-first/no-contact-upload architecture. This backoff is therefore a local UI abuse-control layer only. It does not prevent an attacker who has copied the encrypted `.dials` file from performing offline password guesses with separate tooling; file encryption, KDF cost, and password strength remain the primary protection for that scenario.

## Other protections

- AES-256-GCM encrypted `.dials` package
- PBKDF2-HMAC-SHA256 key derivation (310,000 iterations in the current format)
- password not stored
- decrypted directory not written to persistent browser storage
- fixed 10-minute auto-lock from unlock time
- encrypted package may be retained in IndexedDB for convenience


## Password visibility control (v0.6.0)

The inline eye button only switches the password input between hidden and visible presentation in the active page. It does not persist, transmit, copy, or otherwise store the password. Entering a new locked/data-replacement state restores hidden presentation. Unlock backoff continues to disable password entry and the visibility control together while retry is blocked.
