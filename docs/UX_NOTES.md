# Dials UX notes

Dials is intentionally a **viewer**, not a management app.

## Start / lock screen

- No connected data: show data connection and short usage instructions.
- After selecting a `.dials` file: stay on the same screen and reveal the password field.
- Previously connected encrypted data is reused from IndexedDB.
- Passwords are never persisted.
- Decrypted contacts are never written back to persistent storage.

## Main viewer

- Sticky global search remains available while browsing.
- Home categories: `행정부서`, `학과`, `기타시설`.
- Organization/person order follows the payload, which build38 creates from Sheet1 output order.
- Phone numbers are actionable `tel:` links.

## Search

- Multi-keyword AND matching.
- Search targets name, organization, title, role, extension, and mobile.
- One person with multiple affiliations appears as one result card through `personKey`.
- Same-name people with different `personKey` values remain separate.

## Contact export

Available through `⋯ → 연락처 저장` so the normal viewer stays uncluttered.

- Multi-select people.
- Name is mandatory.
- Optional mobile / extension / affiliation / title-role fields.
- Optional contact-name prefix, remembered locally.
- One VCF may contain multiple VCARD entries.
- Every VCARD note always contains the Dials `dataVersion` date.

## New-data indicator

- `data-status.json` is checked without sending contact data.
- A small yellow `!` appears beside `⋯` only when the public latest date is newer than the connected data.
- The indicator is informative and never blocks current data access.

## Appearance

- Responsive layout; no separate mobile/desktop app.
- System light/dark mode is followed through `prefers-color-scheme`.
