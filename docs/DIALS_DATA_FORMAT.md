# Dials data format — schema 1.5

Dials v0.9.0 keeps the strict encrypted payload contract at **schema 1.5**. HJU Phonebook V0.26.8 build79 exports schema 1.5 and adds the optional public wrapper `dataVersion` described below.

Schema 1.4 and older payloads are intentionally not accepted. The project is still before broad deployment, so the current release keeps one exact contract instead of carrying fallback branches.

## File wrapper

- Extension: `.dials`
- Encoding: UTF-8 JSON
- Outer format: `DialsEncryptedData`
- `formatVersion`: `1`
- Optional public metadata: `dataVersion` (`YYYY-MM-DD`). This date is safe-to-display metadata only; contact records remain encrypted.
- KDF: PBKDF2-HMAC-SHA256, 310,000 iterations
- Cipher: AES-256-GCM
- Contact records exist only inside the encrypted payload.

```json
{
  "format": "DialsEncryptedData",
  "formatVersion": 1,
  "dataVersion": "2026-09-28",
  "kdf": {
    "name": "PBKDF2-HMAC-SHA256",
    "iterations": 310000,
    "salt": "<base64>"
  },
  "cipher": {
    "name": "AES-256-GCM",
    "nonce": "<base64>",
    "ciphertext": "<base64>"
  }
}
```

`dataVersion` in the outer wrapper is optional for compatibility with already-created pre-v0.8.0 files. When present, Dials can show the 기준일 before the password is entered. After decryption, Dials requires the public wrapper `dataVersion` to match the authenticated payload `dataVersion`; a mismatch is rejected. Files without the public field remain readable and reveal the date only after successful decryption.

## Decrypted payload

The top-level object has exactly these fields:

```json
{
  "schemaVersion": "1.5",
  "dataVersion": "2026-09-23",
  "generatedAt": "2026-09-23T10:00:00+09:00",
  "period": "2026.09",
  "title": "혜전대학교 전화번호부",
  "categories": []
}
```

`schemaVersion` must be exactly `1.5`.

## Category

Each category has exactly:

```json
{
  "id": "admin",
  "label": "행정부서",
  "organizations": []
}
```

Current HJU Phonebook exports:

1. `admin` / `행정부서`
2. `academic` / `학과`
3. `facility` / `기타시설`

Dials preserves organization and contact order from the exporter.

## Organization

Each organization has exactly four fields:

```json
{
  "major": "총무처",
  "minor": "총무팀",
  "fax": "041-630-1234",
  "people": []
}
```

- `major`: parent organization label.
- `minor`: child organization/facility label.
- `fax`: explicit organization FAX from HJU Phonebook; empty string when none exists.
- `people`: contact records for that organization. A FAX-only organization may legitimately have an empty array.

The key remains `people`, but an item may represent either a person or a facility/company contact. `recordType` is the only source of that meaning.

## Contact record

Each record has exactly these eight fields:

```json
{
  "personKey": "p000001",
  "name": "홍길동",
  "title": "조교",
  "duty": "방사선",
  "recordType": "PERSON",
  "extension": "041-630-1234",
  "mobile": "010-1234-5678",
  "externalNumber": false
}
```

Facility/company example:

```json
{
  "personKey": "p000002",
  "name": "안경원",
  "title": "",
  "duty": "검안",
  "recordType": "CONTACT",
  "extension": "041-634-3353",
  "mobile": "",
  "externalNumber": true
}
```

### Field meanings

- `personKey`: opaque identifier within the current export. Required. Dials never reconstructs it from name or phone number.
- `name`: visible name. Required.
- `title`: **직함** only. This is the only source for representative-title UI and vCard `TITLE` for PERSON records.
- `duty`: **담당** only. Searchable and optionally preserved in NOTE. It never becomes `TITLE`.
- `recordType`: exactly `PERSON` or `CONTACT`. Dials never infers this from strings.
- `extension`: work/internal number string. HJU build77 exports it independently of Excel sheet number-display settings; explicit person-level number hiding still removes it.
- `mobile`: personal/mobile contact number. Same visibility rule as `extension`.
- `externalNumber`: boolean marker for an extension that is not callable through the internal extension system.

There are deliberately no `job` or `role` alias fields.

## Strict validation

Dials rejects the payload instead of guessing when any of these occur:

- schema version is not `1.5`
- required fields are missing
- unexpected fields are present
- a field has the wrong type
- organization `fax` is not a string
- `recordType` is not `PERSON` or `CONTACT`
- a contact record has both `extension` and `mobile` empty
- the same `personKey` is reused with a different `recordType`

A FAX-only organization is valid even when `people` is empty.

Any future contract change must use a new schema version and an explicit migration/compatibility decision at that time.

## Dials-only synthetic-organization filter

HJU Phonebook may include an academic organization whose `major` is exactly `학사학위 전공심화`. This is an Excel/display duplicate synthesized from the original academic assignment, not a distinct Dials affiliation. Dials excludes that exact synthetic organization before building browse/search/person/vCard models. No name or phone-number inference is used.

## Viewer-specific presentation

- Regular departments/majors may show `fax` as right-side organization metadata.
- `facility` uses a flat presentation: expanding `기타시설` shows facility cards directly.
- A facility record whose visible name repeats the facility name is not duplicated visually, regardless of whether legacy/operational data marks that row as PERSON or CONTACT. A title that merely repeats the facility name is likewise suppressed.
- A real contact-person associated with a facility whose name differs from the facility name is shown inside that same facility card with its own numbers and title/duty.
- FAX is searchable. It is not currently emitted into vCard because there is no user-facing FAX save option.

## vCard mapping

- PERSON representative `title` → `TITLE`
- representative organization path → `ORG`
- `duty` → optional NOTE content only
- PERSON/CONTACT → visible name in both `FN` and a non-empty structured `N` field
- CONTACT → no `TITLE`
- Generated VCF starts directly with `BEGIN:VCARD` (no UTF-8 BOM) and uses `text/vcard` for file handoff
- one `personKey` produces one VCARD entry; unique work/mobile numbers from all included affiliations are merged into that card
- contact-export preference is user-selectable: `mobile` (default) or `extension`; the first available number of the preferred type is serialized first with vCard 3.0 `PREF`, with automatic fallback to the other included type when needed
- a user-selected representative affiliation is ordered first for `ORG`/`TITLE`, work-number order and affiliation NOTE order, so extension priority uses the representative work number first
- all included affiliations/titles/duties may be preserved in NOTE according to the user's export options; when multiple distinct work numbers exist, affiliation NOTE lines also carry the corresponding work number

## Privacy boundary

The HJU Phonebook SQLite database is never distributed to Dials. Exported `.dials` data excludes employee numbers, internal notes, DB IDs, room/install metadata and change logs.
