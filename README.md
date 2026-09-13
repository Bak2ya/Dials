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

---

# 한국어 안내

**별도로 배포되는 로컬 연락처 데이터 파일을 사용하는 웹 기반 연락처 조회 도구**

OurDial은 가볍고 반응형으로 동작하는 연락처 조회용 웹앱입니다. 웹앱 자체와 실제 연락처 데이터는 서로 분리되어 있으며, 사용자는 기관에서 별도로 배포받은 암호화된 `.ourdial` 파일을 불러와 사용합니다. 연결한 암호화 데이터 파일은 이후 다시 선택하지 않아도 되도록 브라우저 로컬 저장소에 보관됩니다.

## 기본 사용 흐름

1. 브라우저 또는 홈 화면 아이콘에서 OurDial을 엽니다.
2. 기관에서 배포받은 `.ourdial` 데이터 파일을 최초 1회 불러옵니다.
3. 데이터 암호를 입력해 전화번호부를 엽니다.
4. 이름, 소속, 내선번호, 개인번호로 검색하거나 소속별로 조회합니다.
5. 이후 다시 실행할 때는 이전에 연결한 암호화 데이터 파일을 자동으로 사용하므로 암호만 다시 입력하면 됩니다.

## 주요 기능

- 모바일/데스크톱 반응형 화면
- 시스템 설정을 따르는 자동 라이트/다크 모드
- 암호화된 `.ourdial` 데이터 파일 불러오기 및 IndexedDB 재사용
- 암호 미저장
- 복호화된 연락처 데이터는 현재 열린 페이지 메모리에서만 사용
- 여러 검색어를 AND 조건으로 처리하는 통합 검색
- 데이터 파일에 저장된 순서를 그대로 사용하는 소속별 조회
- 전화번호 터치 시 전화 연결
- 여러 명을 선택할 수 있는 vCard (`.vcf`) 연락처 내보내기
- `혜)`와 같은 연락처 이름 접두어 옵션
- 내보낸 연락처 메모에 데이터 기준일 자동 기록
- 공개 `data-status.json`을 이용한 최신 전화번호부 데이터 확인
- 최초 정상 접속 이후 앱 화면 오프라인 캐시 지원
- 분석도구, 광고, 외부 API, CDN 및 원격 연락처 데이터 업로드 없음

## GitHub Pages 배포

이 저장소는 별도의 빌드 과정이 필요 없는 정적 웹앱입니다.

1. 저장소 루트에 이 파일들을 업로드합니다.
2. GitHub에서 **Settings → Pages**로 이동합니다.
3. **Deploy from a branch**를 선택합니다.
4. `main` 브랜치와 `/ (root)`를 선택합니다.
5. 배포가 완료되면 `https://bak2ya.github.io/OurDial/`에서 실행할 수 있습니다.

모든 리소스 경로는 상대경로를 사용하므로 `/OurDial/` 프로젝트 경로에서 정상적으로 동작합니다.

## 새 전화번호부 데이터 배포

실제 `.ourdial` 파일은 **이 GitHub 저장소에 업로드하지 않습니다.**

새 암호화 데이터 파일은 기관 내부의 기존 배포 경로를 통해 별도로 전달하고, 이 저장소에서는 `data-status.json`의 최신 데이터 버전만 갱신합니다.

```json
{
  "schemaVersion": 1,
  "latestDataVersion": "2026-09-20",
  "message": "새 전화번호부 데이터가 배포되었습니다."
}
```

사용자가 연결한 데이터의 `dataVersion`이 이 값보다 오래된 경우, OurDial은 메뉴 옆에 작은 노란색 `!`를 표시합니다. 오래된 데이터의 사용 자체를 막지는 않습니다.

## 개인정보 및 보안 구조

- GitHub 저장소에는 **조회용 웹앱만** 포함합니다.
- 실제 이름, 전화번호, 소속, 운영 암호, 암호화 키, `.ourdial` 데이터 파일은 저장소에 포함하지 않습니다.
- 사용자가 불러온 암호화 패키지는 편의를 위해 IndexedDB에 저장됩니다.
- 암호는 저장하지 않습니다.
- 복호화된 연락처 데이터는 브라우저 영구 저장소에 다시 기록하지 않습니다.
- OurDial을 잠그면 페이지를 다시 불러와 현재 페이지 메모리에 있던 복호화 데이터를 해제합니다.
- `data-status.json`에는 최신 버전 확인을 위한 공개 가능한 메타데이터만 포함하며 연락처 데이터는 포함하지 않습니다.

현재 암호화/패키지 규격은 [`docs/OURDIAL_DATA_FORMAT.md`](docs/OURDIAL_DATA_FORMAT.md)에서 확인할 수 있습니다.

## 현재 호환성

현재 OurDial은 **HJU Phonebook V0.8.0 build37**에서 생성한 `.ourdial` 파일을 열 수 있습니다.

Viewer는 각 인물을 구분하기 위한 비표시 식별값 `personKey`도 지원하도록 준비되어 있습니다. 향후 Windows 생성기에서 `personKey`를 포함하면, 한 사람의 여러 소속은 하나의 인물로 정확히 묶으면서 휴대폰 번호가 없는 동명이인은 서로 다른 사람으로 안전하게 구분할 수 있습니다.

현재 build37 데이터는 호환을 위해 `이름 + 개인번호`가 동일한 경우 같은 사람으로 묶고, 개인번호가 없는 경우에는 서로 다른 동명이인을 잘못 합치는 것을 방지하기 위해 별도 인물로 유지합니다.

OurDial은 자체적으로 새로운 소속 또는 인물 정렬 순서를 만들지 않고 `.ourdial` 데이터에 저장된 순서를 그대로 사용합니다.
