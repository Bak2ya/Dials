# Dials

**별도로 배포되는 암호화 연락처 데이터 파일을 사용하는 웹 기반 전화번호부**

🌐 [Dials 열기](https://bak2ya.github.io/Dials/)

Dials는 조직의 연락처를 빠르게 검색하고 조회하기 위한 웹앱입니다.

웹앱 자체와 실제 전화번호부 데이터는 분리되어 있으며, 사용자는 별도로 배포받은 암호화 `.dials` 파일을 연결해 사용합니다.

iPhone, iPad, Android, Windows, macOS의 최신 웹브라우저에서 사용할 수 있습니다.

## 주요 기능

- 이름, 소속, 직함·담당, 전화번호 통합 검색
- 행정부서 / 학과 / 기타시설별 탐색
- 전화번호를 눌러 바로 전화
- 여러 명을 선택해 휴대폰 연락처로 저장
- 다중 소속 인물의 대표 소속·직함 선택
- 시스템 / 라이트 / 다크 / 블랙(OLED) 화면 모드
- 모바일과 데스크톱에 대응하는 반응형 화면
- 홈 화면이나 앱 형태로 추가해 빠르게 실행
- 암호화된 `.dials` 데이터의 로컬 사용

## 기본 사용 방법

1. Dials를 엽니다.
2. 배포받은 `.dials` 파일을 처음 한 번 연결합니다.
3. 데이터 암호를 입력합니다.
4. 이름이나 전화번호로 검색하거나 소속별로 조회합니다.
5. 이후에는 연결한 암호화 파일을 브라우저가 기억하므로 파일을 다시 선택할 필요 없이 암호만 입력하면 됩니다.

## 연락처 저장

`⋯ → 연락처 저장`에서 필요한 사람을 하나 또는 여러 명 선택해 휴대폰 연락처로 저장할 수 있습니다.

필요에 따라 다음 정보를 포함할 수 있습니다.

- 개인번호
- 내선번호
- 소속
- 직함·담당

한 사람이 여러 소속이나 직함을 가지고 있다면 연락처에 사용할 대표 정보를 선택할 수 있습니다.

필요한 경우 연락처 이름 앞에 접두어를 추가할 수도 있습니다.

저장된 연락처의 메모에는 Dials에서 가져온 연락처임을 알 수 있도록 데이터 기준일이 함께 기록됩니다.

## 왜 이런 구성인가요?

일반적인 웹 서비스처럼 연락처 데이터를 중앙 서버에 저장하고 API를 통해 조회하도록 만들 수도 있습니다.

Dials는 대신 **필요한 연락처 정보만 암호화해 사용자의 기기에서 직접 사용하는 구조**를 선택했습니다.

처음 한 번 `.dials` 파일을 별도로 연결해야 하는 과정이 조금 번거로울 수 있지만, 실제 연락처 데이터가 외부 서버·API·서비스를 거쳐야 하는 지점을 줄이기 위한 선택입니다.

이 구조를 선택한 이유와 적용된 보호 방식은 아래 **[개인정보 및 보안](#개인정보-및-보안)**에서 자세히 설명합니다.

## 개인정보 및 보안

### 이 형태로 만들게 된 이유

Dials는 연락처 조회를 위해 외부 서버나 API가 꼭 필요하지 않다고 판단했습니다.

연락처 데이터를 중앙 서버에 모아두고 API를 통해 조회하는 대신, **관리 프로그램에서 필요한 정보만 추출해 암호화한 뒤 사용자의 기기에서 직접 사용하는 로컬 우선 구조**를 사용합니다.

```text
관리 DB
  ↓
필요한 정보만 추출
  ↓
암호화된 .dials 파일 생성
  ↓
사용자 기기에 보관
  ↓
브라우저에서 로컬 복호화
```

이 구조의 목적은 모든 위험을 없애는 것이 아니라, **서버 침해·API 노출·외부 서비스 설정 문제 등으로 연락처 데이터가 외부에 노출될 수 있는 지점을 가능한 한 줄이는 것**입니다.

Dials 웹앱과 실제 연락처 데이터도 서로 분리되어 있습니다.

GitHub에는 조회용 웹앱만 공개하며, 실제 운영 연락처는 별도로 배포되는 암호화 `.dials` 파일에 들어 있습니다.

새 형식의 `.dials` 파일은 연락처 내용과 분리된 공개 가능한 기준일 메타데이터를 포함할 수 있습니다. 이 값은 암호를 입력하기 전 현재 연결된 데이터의 기준일을 보여주는 데만 사용되며, 실제 연락처 내용은 계속 암호화되어 있습니다.

### 보안을 위한 구성

- **실제 연락처 데이터를 GitHub에 포함하지 않습니다.**  
  실제 이름, 개인번호, 내선번호, 소속 데이터, 운영 `.dials` 파일과 관리 DB는 공개 저장소에 두지 않습니다.

- **외부 API를 사용하지 않습니다.**  
  연락처 조회를 위해 외부 서버나 API로 연락처 데이터를 전송하지 않습니다.

- **연락처를 원격 서버에 업로드하지 않습니다.**  
  복호화된 전화번호부는 사용자의 브라우저 안에서 사용됩니다.

- **암호화된 `.dials` 파일만 기기에 보관할 수 있습니다.**  
  한 번 연결한 파일을 다시 선택하지 않아도 되도록 암호화된 패키지는 브라우저의 로컬 저장소에 보관할 수 있습니다.

- **데이터 암호를 저장하지 않습니다.**  
  Dials를 다시 열거나 잠근 뒤에는 암호를 다시 입력해야 합니다.

- **복호화된 연락처를 영구 저장하지 않습니다.**  
  실제 연락처 내용은 브라우저의 영구 저장소에 기록하지 않습니다.

- **잠금 시 현재 복호화 상태를 내려놓습니다.**  
  `잠금`을 실행하면 페이지를 다시 불러와 현재 페이지 메모리에 있던 복호화 데이터를 제거합니다.

- **외부 분석도구와 광고를 사용하지 않습니다.**

- **외부 CDN을 사용하지 않습니다.**

## HJU Phonebook과의 관계

Dials는 전화번호부 **조회용 Viewer**이며, 연락처 자체를 관리하거나 편집하는 프로그램은 아닙니다.

전화번호부 데이터는 별도의 **HJU Phonebook** 관리 프로그램에서 관리합니다.

```text
HJU Phonebook
  ↓
전화번호부 데이터 관리
  ↓
암호화된 .dials 생성
  ↓
별도 배포
  ↓
Dials에서 연결하여 조회
```

Dials는 HJU Phonebook의 관리용 데이터베이스를 직접 읽지 않습니다.

두 프로그램은 암호화된 `.dials` 파일을 통해서만 연결됩니다.

## 변경 내역

버전별 주요 변화는 [`CHANGELOG.md`](CHANGELOG.md)에서 확인할 수 있습니다.

## 기술 문서

구현이나 데이터 형식에 대한 자세한 내용은 다음 문서를 참고하세요.

- [`docs/DIALS_DATA_FORMAT.md`](docs/DIALS_DATA_FORMAT.md) — `.dials` 데이터 형식
- [`docs/SECURITY_NOTES.md`](docs/SECURITY_NOTES.md) — 보안 구조
- [`CHANGELOG.md`](CHANGELOG.md) — 버전별 변경 내역

실제 운영 `.dials` 파일과 연락처 데이터는 공개 GitHub 저장소에 업로드하지 않습니다.

---

# English

**A web-based contact directory using separately distributed encrypted local data files**

🌐 [Open Dials](https://bak2ya.github.io/Dials/)

Dials is a lightweight web app for quickly searching and browsing organizational contact information.

The web application and the actual contact directory are distributed separately. Users connect an encrypted `.dials` file that is provided through a separate distribution channel.

Dials works in modern browsers on iPhone, iPad, Android, Windows, and macOS.

## Features

- Search by name, organization, title/role, or phone number
- Browse administrative departments, academic departments, and other facilities
- Tap phone numbers to call
- Select and export multiple people to device contacts
- Choose representative organization and title information for people with multiple affiliations
- System / Light / Dark / Black (OLED) appearance modes
- Responsive mobile and desktop interface
- Home-screen / app-style shortcut support
- Local use of encrypted `.dials` data

## Basic use

1. Open Dials.
2. Connect the distributed `.dials` file once.
3. Enter the data password.
4. Search or browse the contact directory.
5. On later visits, the encrypted package can be reused locally, so only the password needs to be entered again.

## Why is Dials built this way?

A contact directory could be stored on a central server and accessed through an API.

Dials instead uses **an encrypted data file that is kept and decrypted locally on the user's device**.

Connecting a separate `.dials` file once adds a small extra step, but this design reduces the number of external servers, APIs, and services through which the actual contact data must pass.

See **[Privacy and security](#privacy-and-security)** below for more information.

## Privacy and security

### Why this architecture was chosen

Dials does not require an external server or API to perform ordinary contact lookups.

Instead, only the required information is extracted by the management application, encrypted, distributed as a `.dials` file, and decrypted locally in the user's browser.

```text
Management database
  ↓
Extract only required information
  ↓
Create encrypted .dials file
  ↓
Store on the user's device
  ↓
Decrypt locally in the browser
```

The goal is not to claim that all security risks are eliminated.

The design is intended to **reduce the number of places where contact data could be exposed through server compromise, API exposure, or external-service configuration problems.**

The public Dials web application and the operational contact data remain separate.

Newer `.dials` files may include a public, non-contact data date outside the encrypted payload so Dials can show which dataset is connected before unlock. Actual contact records remain encrypted.

### Security and privacy measures

- Operational contact data is not committed to the public GitHub repository.
- Dials does not use an external contact-data API.
- Decrypted contact data is not uploaded to a remote server.
- The encrypted `.dials` package may be retained locally for convenient reuse.
- The data password is not stored.
- Decrypted contact data is not written to persistent browser storage.
- Locking Dials reloads the page and releases the decrypted active-page state.
- No external analytics or advertising services are used.
- No external CDN is used.

## Relationship with HJU Phonebook

Dials is a **read-only contact viewer**.

Contact information is managed separately in **HJU Phonebook**, which creates the encrypted `.dials` file used by Dials.

```text
HJU Phonebook
  ↓
Manage contact data
  ↓
Create encrypted .dials file
  ↓
Distribute separately
  ↓
Open with Dials
```

Dials does not directly access the HJU Phonebook management database.

The encrypted `.dials` file is the interface between the two applications.

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for notable changes between versions.

## Technical documentation

- [`docs/DIALS_DATA_FORMAT.md`](docs/DIALS_DATA_FORMAT.md) — `.dials` data format
- [`docs/SECURITY_NOTES.md`](docs/SECURITY_NOTES.md) — security architecture
- [`CHANGELOG.md`](CHANGELOG.md) — version history

Operational `.dials` files and real contact data must not be uploaded to the public GitHub repository.
