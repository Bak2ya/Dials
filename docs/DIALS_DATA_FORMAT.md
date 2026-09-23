# Dials data format — schema 1.4

Dials v0.7.2 and HJU Phonebook V0.26.5 build76 use one strict pre-deployment contract: **schema 1.4**.

Older schema 1.3 / 1.2 / 1.1 payloads are intentionally not accepted. The project has not been deployed yet, so the first release keeps one exact contract instead of carrying fallback branches.

## File wrapper

- Extension: `.dials`
- Encoding: UTF-8 JSON
- Outer format: `DialsEncryptedData`
- `formatVersion`: `1`
- KDF: PBKDF2-HMAC-SHA256, 310,000 iterations
- Cipher: AES-256-GCM
- Contact records exist only inside the encrypted payload.

```json
{
  "format": "DialsEncryptedData",
  "formatVersion": 1,
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

## Decrypted payload

The top-level object has exactly these fields:

```json
{
  "schemaVersion": "1.4",
  "dataVersion": "2026-09-23",
  "generatedAt": "2026-09-23T10:00:00+09:00",
  "period": "2026.09",
  "title": "혜전대학교 전화번호부",
  "categories": []
}
```

`schemaVersion` must be exactly `1.4`.

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

Each organization has exactly:

```json
{
  "major": "총무처",
  "minor": "총무팀",
  "people": []
}
```

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
- `extension`: full internal/work number string; may be empty only when `mobile` is present.
- `mobile`: mobile/contact number string; may be empty only when `extension` is present.
- `externalNumber`: boolean marker for an extension that is not callable through the internal extension system.

There are deliberately no `job` or `role` alias fields in schema 1.4.

## Strict validation

Dials rejects the payload instead of guessing when any of these occur:

- schema version is not `1.4`
- required fields are missing
- unexpected fields are present
- a field has the wrong type
- `recordType` is not `PERSON` or `CONTACT`
- both `extension` and `mobile` are empty
- the same `personKey` is reused with a different `recordType`

Any future contract change must use a new schema version and an explicit migration/compatibility decision at that time.

## vCard mapping

- PERSON representative `title` → `TITLE`
- representative organization path → `ORG`
- `duty` → optional NOTE content only
- PERSON/CONTACT → visible name in both `FN` and a non-empty structured `N` field
- CONTACT → no `TITLE`
- Generated VCF starts directly with `BEGIN:VCARD` (no UTF-8 BOM) and uses `text/vcard` for file handoff
- all affiliations/titles/duties may be preserved in NOTE according to the user's export options

## Privacy boundary

The HJU Phonebook SQLite database is never distributed to Dials. Exported `.dials` data excludes employee numbers, notes, internal DB IDs, room/install metadata, and change logs.
