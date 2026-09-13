# Windows exporter follow-up for OurDial

OurDial v0.1.0 can read the `.ourdial` package produced by HJU Phonebook V0.8.0 build37. Two exporter refinements are recommended for the next Windows build so the web viewer can satisfy the final UX rules without heuristics.

## 1. Add an opaque `personKey`

Search results and contact export need to combine one person's multiple affiliations while keeping different people with the same name separate.

Add the same non-displayed key to every affiliation record belonging to one person, for example:

```json
{
  "personKey": "p000123",
  "name": "홍길동",
  "title": "팀장",
  "role": "",
  "job": "팀장",
  "extension": "041-630-1234",
  "mobile": "010-1234-5678"
}
```

Do not use employee number as the exposed value. The key can be a generated opaque token/ordinal that only has meaning inside the exported data.

## 2. Emit people in the exact Sheet1 person-output order

OurDial deliberately does not re-sort organizations or people. It renders the arrays in the order supplied by the encrypted payload.

Therefore the Windows exporter should build each organization's `people` array from the **Sheet1 person-output order**, matching the user's final decision for OurDial browsing.

The organization arrays should continue to follow the existing Sheet1 organization-output order.

## Compatibility

The web viewer already accepts `personKey` when present. Build37 files remain readable: identical `name + mobile` records are grouped, while records without a mobile number remain separate to avoid unsafe same-name merging.
