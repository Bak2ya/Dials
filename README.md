# OurDial

**Web-based contact viewer with separately distributed local data files**

OurDial is a lightweight, responsive contact viewer. The web app is hosted separately from the actual contact data: users import an encrypted `.ourdial` file distributed through their organization, and the encrypted file is kept locally in the browser for later use.

## Core flow

1. Open OurDial in a browser or from a home-screen icon.
2. Import a distributed `.ourdial` data file once.
3. Enter the data password to unlock it.
4. Search by name, organization, extension, or mobile number, or browse by organization.
5. On later visits, the previously connected encrypted file is reused; only the password is required again.

## Features

- Responsive mobile/desktop viewer
- Automatic light/dark appearance based on the system setting
- Local encrypted `.ourdial` data import and IndexedDB reuse
- Password never stored by OurDial
- Decrypted contact data kept only in the active page memory
- Unified search with multi-keyword AND matching
- Organization browsing in the order provided by the data file
- Tap-to-call phone numbers
- Multi-select vCard (`.vcf`) export
- Optional contact-name prefix such as `혜)`
- Data version date automatically written into every exported contact note
- Public `data-status.json` check for a newer distributed data version
- Offline app-shell support after the first successful visit
- No analytics, ads, external APIs, CDNs, or remote contact-data upload

## GitHub Pages

This repository is intentionally static. No build process is required.

1. Put these files in the root of the `OurDial` repository.
2. In GitHub, open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`.
5. Open `https://bak2ya.github.io/OurDial/` after Pages finishes deploying.

All asset paths are relative, so the app works correctly from the `/OurDial/` project path.

## Publishing a new contact-data version

The actual `.ourdial` file must **not** be uploaded to this repository.

Distribute the new encrypted data file through the organization's normal private channel. Then update only `data-status.json` in this repository:

```json
{
  "schemaVersion": 1,
  "latestDataVersion": "2026-09-20",
  "message": "새 전화번호부 데이터가 배포되었습니다."
}
```

When a user's connected data has an older `dataVersion`, OurDial shows a small yellow `!` beside the menu. It does not block access to the older data.

## Privacy and security model

- The GitHub repository contains the **viewer only**.
- Real names, phone numbers, departments, operational passwords, encryption keys, and `.ourdial` files must never be committed.
- The imported encrypted package is stored in IndexedDB for convenience.
- The password is not saved.
- The decrypted payload is not written back to persistent browser storage.
- Locking OurDial reloads the page so the decrypted payload is released from the active page state.
- `data-status.json` contains only public update metadata, not contact data.

See [`docs/OURDIAL_DATA_FORMAT.md`](docs/OURDIAL_DATA_FORMAT.md) for the current encryption/package format.

## Current compatibility note

OurDial can open the `.ourdial` files produced by **HJU Phonebook V0.8.0 build37**.

The viewer also supports an optional opaque `personKey` on each person record. A future Windows exporter should include that key so the viewer can reliably combine one person's multiple affiliations while keeping same-name people separate even when a mobile number is missing. Until then, build37 data uses a conservative compatibility fallback: identical `name + mobile` records are grouped, while records without a mobile number are kept separate rather than risk merging two different people.

The viewer never invents a new organization sort order. It preserves the organization/person array order supplied by the `.ourdial` payload.

## Repository description

> Web-based contact viewer with separately distributed local data files
