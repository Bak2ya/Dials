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
- Organization/person order follows the payload generated from HJU Phonebook Sheet1 output order.
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
- System light/dark mode is followed through `prefers-color-scheme`. Manual Light / Dark / Black(OLED) overrides are available.
## v0.1.2 appearance and shortcut

- `⋯ → 바로가기 추가`: browser/PWA install prompt when available; iPhone/iPad shows Safari `공유 → 홈 화면에 추가` instructions.
- `⋯ → 화면 모드`: system / light / dark / black(OLED). System is the default, manual choice is stored locally.
- Theme selector uses native radio semantics.
- Light / Dark / Black use the shared House Palette. Black keeps large surfaces at true `#000000`.


## v0.1.2 iOS import compatibility

- Do not use an HTML `accept` filter for the custom `.dials` extension. iOS Files can otherwise gray the file out and make it impossible to select.
- Let the user pick the file first, then validate the internal `DialsEncryptedData` wrapper in JavaScript.
- File reading uses `File.text()` when available with a `FileReader` fallback for broader Safari compatibility.
- The final Dials icon is used in the app header, manifest icons, favicon, and Apple touch icon.
## v0.2.0 external numbers

- HJU Phonebook remains the source of truth for whether a number can be reached through the internal extension system.
- `externalNumber: true` does not create a new phone field. Dials keeps the same full number and appends `(외부번호)` in the viewer.
- The familiar `내선번호` / `내선` wording remains in the viewer. External numbers keep the same slot and append `(외부번호)` rather than introducing a second phone-number vocabulary.
- Schema 1.1 files without the field continue to behave as ordinary extension-callable numbers.



## v0.3.0 navigation and accessibility

- Internal navigation writes meaningful browser history entries: home → category → organization.
- Browser/Android Back restores the previous Dials view rather than unexpectedly leaving the app.
- A search session creates one history entry; editing the query replaces that same entry. Back clears the search by returning to the previous route.
- Contact export is a history route; Back returns to the viewer.
- Scroll position is saved into the current history entry and restored on Back/Forward.
- Modals trap Tab focus, Esc closes them, and closing restores focus to the opener.
- The `⋯` popover uses ordinary buttons; it does not claim `role=menu` without implementing full menu keyboard semantics.

## v0.3.1 IME search composition

- Global search must not rerender results while the browser IME is composing text.
- `compositionstart` marks the search as composing; intermediate `input` events are ignored.
- `compositionend` commits the completed query once. A following non-composing `input` event is harmless because unchanged queries are ignored.
- This protects Korean first-character composition and also applies to Japanese/Chinese and other IME workflows.
- Search History semantics from v0.3.0 remain unchanged: one History entry per search session, later query edits replace that entry.

