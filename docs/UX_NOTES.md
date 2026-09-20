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

## v0.3.2 mobile IME and overflow menu

- The v0.3.1 composition-only guard was insufficient on real mobile Korean keyboards because event ordering differs across browser/IME combinations. Synthetic composition tests alone are not evidence of real-device IME correctness.
- Global search now treats the input field as browser/IME-owned: it avoids History/scroll-state writes while the search field is active and debounces result rendering after input stabilizes.
- A search-session History entry is prepared when the field receives focus, before text composition starts, so Back can still leave search without changing History on each keystroke.
- Contact-export search uses the same debounced/composition-safe policy, without adding a History route.
- Do not assign to the search input value during normal typing. Programmatic value changes remain limited to explicit navigation/clear/restore operations.
- The overflow `⋯` keeps its visual weight but uses a 48×48px hit target; action rows are at least 48px high for mobile use.
- `⋯ → 정보` explains user-relevant privacy/security behavior, shows the app version, and links to GitHub. Cryptographic algorithm details remain in technical documentation rather than the general About view.

## v0.3.1 IME search composition

- Global search must not rerender results while the browser IME is composing text.
- `compositionstart` marks the search as composing; intermediate `input` events are ignored.
- `compositionend` commits the completed query once. A following non-composing `input` event is harmless because unchanged queries are ignored.
- This protects Korean first-character composition and also applies to Japanese/Chinese and other IME workflows.
- Search History semantics from v0.3.0 remain unchanged: one History entry per search session, later query edits replace that entry.


## v0.4.0 contact export and auto-lock

- Contact export reuses the main viewer's information architecture: category → organization → person. Do not return to one flat full-directory list.
- Category/organization rows are intentionally more compact than normal viewer cards because the task is selection, not reading full contact details.
- Organization checkboxes select every unique `personKey` in that organization. If only some are selected, the organization checkbox uses the native indeterminate/mixed state.
- Selection is keyed by `personKey`, never by visible row. A person with multiple affiliations must stay checked everywhere that person appears, including search results.
- VCF generation uses the same unique-person set, so a multi-affiliation person is exported once.
- Search and hierarchy navigation share the same selection state; browsing never clears previous selections.
- Existing contact-export field options and name-prefix settings persist while moving between categories and organizations.
- Unlock starts a fixed 10-minute privacy session. User activity does not extend it. Timer throttling in the background is handled by checking absolute elapsed time again on focus, visibility return, and pageshow.
- Automatic lock uses the same locked start screen as the existing manual `잠금` action and clears decrypted/derived in-memory state by reloading the page.
- The start screen tells users, in plain language, that contact data stays on the device and the view locks after 10 minutes.
- The connected data date is intentionally more prominent; Dials no longer performs a separate public latest-data check.
- About is user-facing. Technical storage/encryption details belong in README/data-format documentation.

