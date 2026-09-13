# OurDial UX notes

OurDial is intentionally a **viewer**, not a management app.

## Main flow

1. Connect encrypted data.
2. Enter password on the same start screen.
3. Search or browse by organization.
4. Tap a phone number to call.

No editing or management controls are shown in the main viewer.

## Start screen

- First visit: data import button + short usage guide.
- Returning visit: previously connected encrypted data is detected and only the password field is shown.
- Selecting a new file never auto-unlocks it; the user explicitly enters the password.

## Main viewer

- Global search remains available at the top of every browsing screen.
- Home categories: `행정부서`, `학과`, `기타시설` as provided by the data file.
- The app preserves the order contained in the `.ourdial` payload.
- Search results group multiple affiliations under one person when a reliable person identity is available.
- Same-name people remain separate when their identity differs.
- Missing phone-number lines are omitted.
- Appearance follows the operating system light/dark setting automatically.

## Overflow menu

The top-right `⋯` contains infrequent tasks:

- Data information
- Import new data
- Contact export
- Lock

A yellow `!` appears immediately beside the menu only when `data-status.json` reports a newer data version.

## Contact export

Contact export is deliberately kept out of the normal lookup flow.

Users can:

- Search and select one or multiple people.
- Select all people in the current filtered list.
- Choose whether to include mobile number, extension, affiliation, and title/role.
- Optionally add a reusable prefix to every contact name, for example `혜)`.
- Export one multi-contact `.vcf` file.

Name is always included. Every vCard note always includes the `.ourdial` **data version date** so users can later identify how current an imported contact was.
