# Dials

**별도로 배포되는 로컬 연락처 데이터 파일을 사용하는 웹 기반 연락처 조회 도구**

🌐 <a href="https://bak2ya.github.io/Dials/" target="_blank" rel="noopener noreferrer">Dials 웹앱 열기</a>

<img src="./icons/icon-192.png" alt="Dials 아이콘" width="96" height="96">

Dials는 조직의 연락처를 빠르게 조회하기 위한 가볍고 반응형인 웹앱입니다. 웹앱 자체와 실제 전화번호부 데이터는 완전히 분리되어 있으며, 사용자는 Windows 관리 프로그램에서 생성해 별도로 배포된 암호화 `.dials` 파일을 불러와 사용합니다.

## 기본 사용 흐름

1. 브라우저 또는 홈 화면 아이콘에서 Dials를 엽니다.
2. 배포받은 `.dials` 데이터 파일을 최초 1회 연결합니다.
3. 파일을 연결하면 같은 화면에 나타나는 암호 입력란에서 데이터 암호를 입력합니다.
4. 이름, 소속, 내선번호, 개인번호로 검색하거나 `행정부서 / 학과 / 기타시설`을 따라 조회합니다.
5. 이후 다시 실행할 때는 이전에 연결한 암호화 파일을 브라우저가 기억하므로 파일을 다시 선택하지 않고 암호만 입력하면 됩니다.

## 주요 기능

- iPhone / iPad / Android / Windows / macOS 브라우저 반응형 화면
- 확정된 Dials 공식 아이콘을 웹 헤더 / PWA / iPhone 홈 화면 아이콘에 공통 적용
- iOS 파일 선택기에서 `.dials` 파일이 비활성화되던 문제 수정
- `⋯ → 화면 모드`에서 시스템 / 라이트 / 다크 / 블랙(OLED) 선택 (기본값은 시스템)
- House Palette 기준 라이트 / 다크 / 블랙(OLED) 테마
- `⋯ → 정보`에서 개인정보 보호·보안 방식, 현재 버전, GitHub 링크 확인
- `⋯ → 바로가기 추가`에서 지원 브라우저의 앱 설치 안내를 사용하고, iPhone/iPad에서는 `공유 → 홈 화면에 추가` 방법 안내
- 암호화 `.dials` 파일 불러오기 및 IndexedDB 재사용
- 암호 미저장
- 동일한 암호화 `.dials` 패키지는 파일명이 바뀌어도 SHA-256 지문으로 식별하여, 현재 브라우저 안에서 암호 실패 횟수와 재시도 지연을 이어서 적용
- 암호 4회 실패부터 10초 → 30초 → 1분 → 5분 → 최대 15분으로 재시도 지연
- 강한 Content Security Policy(CSP)로 외부 스크립트·외부 통신·iframe/플러그인 등 사용하지 않는 경로를 제한
- 복호화된 연락처 데이터는 현재 열린 페이지 메모리에서만 사용
- 잠금 해제 시점부터 10분이 지나면 자동 잠금(백그라운드 복귀 시에도 만료 여부 재확인)
- 여러 검색어를 AND 조건으로 처리하는 통합 검색
- Windows 프로그램의 시트1 출력순서를 그대로 사용하는 소속/인물 조회
- `personKey` 기준으로 동일인의 여러 소속을 검색 결과 한 카드에 통합
- 이름이 같은 다른 사람은 서로 다른 `personKey`로 별도 표시
- 전화번호를 누르면 전화 앱 연결
- HJU Phonebook에서 내선 연결 불가로 지정한 번호는 전체 번호 뒤에 **`(외부번호)`** 표시
- `⋯ → 연락처 저장`에서 `구분 → 주요 소속 → 하위 소속 → 인물`을 필요할 때만 펼쳐 선택
- 소속 전체 선택 및 일부 선택(혼합 상태) 지원
- 다중소속 인물은 `personKey` 하나의 선택 상태를 공유하며 vCard에 중복 저장되지 않음
- 연락처 여러 명 선택 및 하나의 vCard (`.vcf`) 파일 생성
- vCard 기본 필드에 넣을 개인번호 / 내선번호 / 직장·기관 선택
- 연락처 저장 목록에서는 번호를 반복 표시하지 않고 이름 + 직위/역할 대표 버튼 + 사람 선택 체크박스에 집중
- 사람별 대표 버튼으로 다중소속 중 하나의 **부서 + 직위/역할**을 대표 정보로 선택(대표를 선택하지 않는 것도 가능)
- 이름은 항상 포함
- 이름 앞/뒤에 원하는 문자열을 그대로 붙이는 옵션과 각각의 마지막 사용값 기억
- `메모에 기록할 내용`에서 데이터 기준일 / 전체 소속 / 전체 직책·역할을 각각 선택
- 최초 정상 접속 뒤 앱 화면의 오프라인 캐시 지원
- 광고, 분석도구, 외부 API, CDN 및 연락처 원격 업로드 없음


## v0.6.0 연락처 대표 정보 · 메모 옵션 · 스크롤/화면 정리

- 큰 화면에서도 Dials의 주요 콘텐츠 폭을 시작 화면과 같은 최대 폭으로 통일해, 넓은 모니터에서 조회/저장 UI가 과도하게 늘어나지 않도록 정리했습니다.
- 시작 화면의 데이터 암호 입력칸 안에 눈 모양의 표시/숨기기 버튼을 추가했습니다. 입력값·커서 위치는 유지하며, 잠금/데이터 교체 등 새 암호 입력 상태에서는 다시 숨김으로 시작합니다.
- v0.4.1부터 사용하던 JS 기반 `no-page-scroll` 잠금/해제 로직을 제거하고 브라우저의 기본 페이지 스크롤에 맡깁니다. 펼침 애니메이션과 viewport 재계산 타이밍에 따라 연락처 저장 화면의 스크롤이 간헐적으로 잠기던 원인을 제거했습니다.
- 조회/연락처 저장의 펼친 카드에서 헤더와 하위 내용 사이의 얇은 구분선을 제거하고 기존 내부 여백만 유지합니다.
- 연락처 저장의 왼쪽 영역은 별도 `저장할 사람` 제목 없이 `저장할 사람을 선택하세요.` 안내로 시작합니다. 선택 목록에서는 어차피 저장되는 전화번호를 숨기고 **이름 + 직위/역할 대표 버튼 + 오른쪽 사람 선택 체크박스**만 표시합니다.
- 직위/역할 버튼(예: `처장`, `교수`)을 선택하면 그 카드가 속한 소속을 vCard의 대표 **부서**로, 해당 직위/역할을 `TITLE`로 기록합니다. 한 사람에게 대표 정보는 최대 하나이며, 다른 소속의 대표 버튼을 누르면 기존 대표에서 새 대표로 바꿀지 확인합니다. 대표 버튼을 다시 누르면 대표 정보 없음 상태로 돌아갈 수 있습니다.
- `직장 / 기관`은 별도 전역 옵션으로 두며 현재 전화번호부 제목에서 기관명(예: `혜전대학교`)을 가져옵니다. 대표 부서가 함께 있으면 vCard `ORG`는 `기관;부서` 형태로 기록됩니다.
- 기존의 소속/직책 저장 옵션과 `메모에 항상 포함` 안내를 재구성해 `메모에 기록할 내용` 하위 카드에서 **데이터 기준일 / 소속 / 직책·역할**을 각각 선택할 수 있게 했습니다. 다중소속의 전체 정보는 메모에 보존하면서 기본 연락처 필드는 대표 하나만 깔끔하게 표시할 수 있습니다.
- `.dials` 포맷/schema는 변경하지 않았습니다. `personKey`, CSP, 암호 실패 지연, 10분 고정 자동 잠금, IME-safe 검색, History/Back, 안전한 데이터 교체, v0.5.5 Safari vCard 우회와 이름 앞/뒤 문자열 기능을 그대로 유지합니다.

## v0.5.5 iPhone 연락처 파일 저장 호환성 · 이름 앞/뒤 문자열

- iPhone/iPad Safari 계열에서 브라우저가 직접 만든 vCard Blob을 다운로드하지 못할 수 있는 WebKit 동작을 우회하도록, iOS 계열에서는 다운로드 시 vCard 내용을 `application/octet-stream` Blob으로 다시 감싸고 `.vcf` 파일명은 그대로 유지합니다. 다른 브라우저는 기존 `text/vcard` Blob 경로를 유지합니다.
- `이름 앞에 글자 추가`의 예시는 `직장`, `이름 뒤에 글자 추가`의 예시는 `교수`로 정리했습니다.
- 앞/뒤 문자열에는 앱이 공백을 자동으로 넣거나 제거하지 않습니다. 사용자가 입력한 문자열을 이름에 그대로 붙입니다.
- 앞/뒤 옵션은 독립적으로 켜고 끌 수 있고 마지막 입력값과 활성 상태를 각각 브라우저에 기억합니다.
- 두 옵션의 최종 결과를 같은 설정 묶음 아래에서 `박주성`을 기준으로 실시간 미리보기합니다.

## v0.5.4 펼침 상태의 배경 강조 제거

- 조회 화면과 연락처 저장 화면에서 펼침 상태 자체를 지속적인 배경색 변화로 표현하지 않습니다. 펼침 여부는 chevron 방향과 실제 하위 항목 노출만으로 전달합니다.
- 모바일 Safari/Chrome처럼 터치 뒤 `:hover`가 잠시 유지될 수 있는 환경에서 카드가 선택된 것처럼 보이지 않도록, 트리 카드의 hover 배경은 실제 hover를 지원하는 정밀 포인터(마우스/트랙패드)에서만 적용합니다.
- 연락처 저장의 선택 상태는 기존대로 오른쪽 체크박스/혼합 상태만 담당하며, 펼침 상태와 선택 상태를 시각적으로 분리합니다.
- 계층, 카드 배경 토큰, 펼침 애니메이션, 체크 동작, 데이터/보안 기능은 변경하지 않았습니다.

## v0.5.3 펼친 카드 배경 연속성

- 조회 화면과 연락처 저장 화면에서 부모 카드를 펼쳤을 때, 확장된 내부 영역이 부모 헤더와 동일한 배경색을 그대로 이어받도록 수정했습니다.
- 계층 구조, 들여쓰기, 테두리, 애니메이션, 선택 동작은 v0.5.2와 동일하며 색상 연속성만 조정했습니다.

## v0.5.2 중첩 카드 계층 · 펼침 애니메이션

- 일반 조회와 연락처 저장의 계층 UI를 같은 중첩 카드 문법으로 통일했습니다.
- 하위 소속을 오른쪽으로 크게 밀지 않고, 상위 카드가 펼쳐지면서 내부에 하위 카드가 나타나는 구조로 바꿨습니다. 모바일 가로 공간 손실을 줄이면서 부모/자식 관계를 더 명확하게 보여줍니다.
- 최상위는 House `Surface`, 내부 조직은 `Secondary Surface`를 사용하고 더 깊은 단계는 새 색을 추가하지 않고 내부 여백·테두리·타이포그래피로 구분합니다. Black(OLED)에서는 색상 차이보다 경계와 구조가 계층을 전달합니다.
- 펼침/접힘에는 약 180ms의 짧은 CSS 기반 높이/투명도 애니메이션을 적용하고, `prefers-reduced-motion` 사용자는 애니메이션을 사용하지 않습니다. 지속적인 렌더링 루프는 없습니다.
- 연락처 저장은 기존의 왼쪽 disclosure / 오른쪽 체크박스 문법, 전체/부분 선택, `personKey` 동기화와 중복 제거를 그대로 유지합니다.

## v0.5.1 조회 화면 트리 통일

- 일반 조회 화면도 연락처 저장 화면과 같은 단계형 펼침/접힘 계층으로 통일했습니다.
- 처음에는 `행정부서 / 학과 / 기타시설`만 닫힌 상태로 보이고, 구분 → 주요 소속 → 하위 소속 순서로 필요한 항목만 펼칩니다.
- 주요 소속을 펼치면 그 소속에 직접 속한 책임자/인물이 먼저 나오고, 하위 부서는 같은 깊이에 이어집니다. 하위 부서를 펼치면 그 안의 연락처가 표시됩니다.
- 조회 화면에는 선택 체크박스를 두지 않고, 연락처 저장 화면과 조직 계층·순서만 공유합니다.
- 첫 화면의 `소속별 조회` 제목은 제거하고 안내 문구를 `소속을 선택하거나 검색창에서 바로 찾아보세요.`로 간결하게 정리했습니다.
- 검색 결과, 전화 링크, 외부번호 표기, History/Back, IME-safe 검색 등 기존 조회 동작은 유지합니다.

## v0.5.0 보안 강화 · 암호 실패 지연 · 시작 화면 정리

- Content Security Policy(CSP)를 추가해 기본 리소스 허용 범위를 닫고, 스크립트·스타일·이미지·Service Worker/PWA 리소스만 필요한 범위에서 허용합니다. 앱 페이지의 `fetch`/XHR/WebSocket 계열 외부 통신은 `connect-src 'none'`으로 차단합니다.
- 기존 인라인 테마 초기화 코드는 `theme-init.js`로 분리해 `script-src 'self'` 정책에서 `unsafe-inline` 없이 동작하도록 정리했습니다.
- `.dials`의 암호화 핵심 필드로 SHA-256 지문을 계산해 파일명이 바뀌어도 같은 암호화 패키지의 암호 실패 기록을 현재 브라우저에서 이어갑니다. 지문은 연락처 평문이나 암호가 아닙니다.
- 암호 실패 1~2회는 즉시 재시도, 3회째에는 다음 실패 시 10초 지연을 사전 안내합니다. 4회부터 10초 → 30초 → 1분 → 5분 → 15분 순으로 대기 시간이 증가하며, 성공적으로 열면 해당 파일 지문의 실패 기록을 초기화합니다.
- 이 제한은 브라우저 로컬 저장소 기반의 UI 보조 방어입니다. 다른 브라우저/기기와 실패 횟수를 공유하려면 중앙 서버가 필요하고 Dials의 로컬 우선·개인정보 비전송 구조와 충돌하므로 적용하지 않습니다. 오프라인 암호 추측 방어는 계속 파일 암호화/KDF와 충분히 강한 암호가 담당합니다.
- 시작 화면 상단은 Dials 이름에 집중하도록 소개 문구를 제거했습니다. 하단 바깥쪽에 `배포받은 연락처 데이터로 빠르게 조회하는 웹 전화번호부입니다.`와 실제 앱 버전을 표시합니다.
- 사용 방법 문구를 `배포받은 파일(.dials)을 불러옵니다.` / `연결 후 암호를 입력하면 연락처가 열립니다.` / `연결한 다음부터는 암호만 입력하면 됩니다.`로 간결하게 정리했습니다.

## v0.4.2 연락처 저장 트리 · 선택 문법 정리

- 연락처 저장 화면을 별도 페이지를 계속 들어가는 방식 대신 **한 화면의 펼침/접힘 트리**로 정리했습니다.
- 처음에는 `행정부서 / 학과 / 기타시설`만 닫힌 상태로 보이고, 구분을 열면 `총무처 / 교무처 ...` 같은 주요 소속만 나타납니다. 주요 소속을 열면 직속 책임자/인물이 먼저 나오고 그 아래 하위 부서가 같은 위계로 이어지며, 하위 부서를 열면 인물이 표시됩니다.
- 일반적인 트리 문법에 맞춰 **펼침/접힘은 왼쪽**, **선택 체크박스는 오른쪽**으로 분리했습니다. 두 조작 영역은 서로 독립되어 체크하다가 항목이 열리거나, 열다가 체크되는 오작동을 막습니다.
- 주요 소속과 하위 소속의 체크박스는 해당 범위의 인물을 전체 선택하며, 일부만 선택되면 혼합 상태를 표시합니다. 다중소속 인물은 기존처럼 `personKey` 하나의 선택 상태를 공유합니다.
- 부처 자체에 직접 속한 책임자/인물은 하위 부서보다 먼저 표시하면서 하위 부서와 같은 깊이에 둡니다.
- 일반 조회 화면의 `시트1 기준의 소속 순서로 표시됩니다.` 문구는 제거했습니다. 실제 순서는 기존 데이터 순서를 계속 따릅니다.
- 검색 결과도 선택 체크박스를 오른쪽에 두어 같은 선택 문법을 사용합니다.
- 잠금 해제 성공 직후에는 전화번호부 준비/렌더링보다 먼저 모바일 키보드와 visual viewport 정리를 시작하도록 순서를 보강했습니다.

## v0.4.1 모바일 첫 터치 · 안전한 데이터 교체 · 연락처 계층

- 잠금 해제 직후 암호 입력 포커스와 모바일 키보드/visual viewport 전환을 정리해 상단 `⋯`의 첫 터치가 바로 동작하도록 보강했습니다. 실제 iPhone의 키보드 전환은 최종 실기기 확인 대상으로 남깁니다.
- `⋯ → 새 데이터 불러오기`는 최초 데이터 연결 화면으로 돌아갑니다. 새 파일은 암호가 정상 확인된 뒤에만 기존 저장 데이터를 교체하므로 중간 취소·잘못된 파일·틀린 암호로 마지막 정상 데이터가 사라지지 않습니다.
- 화면 내용이 실제 viewport보다 짧으면 불필요한 세로 스크롤/바운스를 억제하고, 길 때만 정상 스크롤합니다.
- 연락처 저장의 소속 탐색에서 부처 자체에 직접 속한 책임자/인물은 `총무처 → 총무처` 같은 중복 소속 행 대신 부서들과 같은 위계의 인물 행으로 표시합니다. `.dials`에 들어온 조직/인물 순서는 그대로 유지합니다.
- 직속 인물도 기존 `personKey` 선택 상태를 공유하므로 다중소속 인물 체크 동기화와 vCard 중복 제거가 그대로 적용됩니다.

## v0.4.0 연락처 저장 구조 · 자동 잠금 · 정보 계층

- 연락처 저장 화면을 긴 전체 인물 목록에서 메인 화면과 같은 `구분 → 소속 → 인물` 탐색 구조로 변경했습니다.
- 소속 행과 소속 상세 화면에서 전체 선택할 수 있으며, 일부만 선택되면 체크박스가 혼합 상태로 표시됩니다.
- 동일한 `personKey`를 가진 다중소속 인물은 어느 소속/검색 결과에서 체크해도 같은 선택 상태를 공유하고 vCard에는 한 번만 저장됩니다.
- 연락처 저장 화면의 행 높이를 줄여 모바일에서 더 많은 항목을 한눈에 볼 수 있게 했습니다.
- 잠금 해제 시점부터 10분이 지나면 활동 여부와 관계없이 자동으로 잠기며, 모바일 브라우저가 백그라운드에서 타이머를 늦춰도 화면 복귀 시 만료 여부를 다시 확인합니다.
- 시작 화면에 사용자 친화적인 보안 안내를 추가하고, 연결된 데이터의 기준일을 더 잘 보이게 표시합니다.
- `⋯ → 정보`는 사용자에게 필요한 보호 원칙만 간단히 보여주고 암호화/저장 방식의 기술 세부사항은 GitHub 문서에서 확인하도록 정리했습니다.
- 공개 최신 데이터 확인 기능과 `data-status.json` 의존성을 제거했습니다. 기준일은 연결된 `.dials` 데이터 자체의 `dataVersion`을 표시합니다.

## v0.3.2 모바일 IME · 메뉴 사용성 · 정보 화면

- 모바일 한글 입력에서 첫 자모 뒤 다음 자모를 입력할 때 조합이 끊길 수 있던 문제를 다시 수정했습니다.
- 검색 중에는 History/스크롤 상태를 계속 갱신하지 않고, 검색 입력 자체는 브라우저/키보드에 맡긴 뒤 짧은 debounce 후 결과만 갱신합니다.
- 메인 검색과 `연락처 저장` 검색에 같은 IME-safe 입력 방식을 적용했습니다.
- 상단 `⋯`의 실제 터치 영역을 48×48px로 넓히고 메뉴 항목도 최소 48px 높이로 보강했습니다.
- `⋯ → 정보`를 추가해 Dials 설명, 개인정보 보호 및 보안 방식, 현재 버전, GitHub 링크를 확인할 수 있습니다.
- 정보 화면은 일반 사용자가 필요한 보호 원칙만 설명하고, AES/PBKDF2 같은 기술 세부사항은 이 README와 데이터 형식 문서에 유지합니다.
- v0.3.0의 뒤로가기/History, 스크롤 복원, 접근성, Light/Dark/Black(OLED), v0.2.0의 외부번호 표시는 그대로 유지합니다.

## v0.3.1 한글·IME 검색 입력 수정

- 한글, 일본어, 중국어처럼 IME 조합 입력이 필요한 검색에서는 조합 중간 상태로 검색 결과를 다시 렌더링하지 않습니다.
- `compositionend`에서 글자가 확정된 뒤 검색/History를 한 번만 갱신하여 첫 글자가 사라지거나 조합이 끊기는 문제를 수정했습니다.
- 영문·숫자 검색은 기존처럼 즉시 반영됩니다.
- v0.3.0의 뒤로가기, 검색 History, 스크롤 복원, OLED 테마 동작은 그대로 유지합니다.

## v0.3.0 웹 내비게이션 · 접근성 · OLED

- 브라우저/Android 시스템 **뒤로가기**가 Dials 내부의 `홈 → 분류 → 소속` 이동과 자연스럽게 연결됩니다.
- 검색 진입은 History에 한 번만 기록되며, 뒤로가기를 누르면 검색 이전 화면과 스크롤 위치로 돌아갑니다.
- `연락처 저장`도 History에 연결되어 브라우저/시스템 뒤로가기로 전화번호부에 복귀합니다.
- 목록으로 돌아왔을 때 이전 스크롤 위치를 복원합니다.
- 모달은 Tab 포커스를 내부에 유지하고 닫을 때 원래 조작하던 컨트롤로 포커스를 돌려줍니다.
- `⋯`는 ARIA menu 역할을 억지로 선언하지 않고 일반 popover 버튼 목록으로 정리했습니다.
- 화면 모드는 실제 radio group이며 `시스템 / 라이트 / 다크 / 블랙(OLED)`을 제공합니다.
- 라이트/다크/블랙은 공통 House Palette 기준으로 정리했습니다.
- `내선번호`라는 익숙한 전화번호부 용어는 유지합니다. 외부번호도 같은 번호 자리에서 `(외부번호)`만 덧붙여 표시합니다.

## v0.2.0 외부번호 표시

HJU Phonebook의 `번호 기반`에서 `내선 연결 가능`을 끈 번호는 Dials에서 전체 번호를 그대로 유지하면서 뒤에 **`(외부번호)`**를 표시합니다. 이 표시는 번호의 성격을 알려주는 정보이며 전화 링크 자체는 전체 번호를 그대로 사용합니다.

기존 schema 1.1 데이터에는 이 필드가 없으므로 일반 내선번호와 동일하게 표시됩니다.

## iPhone / iPad 데이터 파일 선택

Dials v0.1.2에서는 iOS 파일 선택기에서 커스텀 확장자 `.dials` 파일이 회색으로 비활성화되어 선택되지 않던 문제를 수정했습니다. 브라우저의 파일 형식 필터에 의존하지 않고 파일을 선택한 뒤, Dials가 내부의 `DialsEncryptedData` 형식을 직접 검사합니다.

따라서 iPhone/iPad에서는 배포받은 `.dials` 파일을 **파일 앱 / iCloud Drive 등에서 그대로 선택**할 수 있습니다. 잘못된 파일을 고르면 가져온 뒤 Dials가 형식 오류를 안내합니다.

## 화면 모드와 바로가기

상단 `⋯` 메뉴의 **화면 모드**에서 `시스템 / 라이트 / 다크 / 블랙(OLED)`을 선택할 수 있습니다. 기본값은 시스템이며, 사용자가 직접 선택한 모드는 현재 브라우저에 기억됩니다.

- 라이트: House Palette의 warm-neutral 기준 (`#F6F1E8` 배경)
- 다크: developer-neutral 기준 (`#0D1117` 배경)
- 블랙(OLED): 넓은 배경과 surface를 `#000000`으로 유지하여 OLED 발광 면적을 줄이는 모드
- Accent: 웹 fallback `#3478F6`

화면 모드 선택은 실제 radio group을 사용합니다.

`⋯ → 바로가기 추가`는 설치를 직접 지원하는 브라우저에서는 PWA 설치 안내를 사용합니다. iPhone/iPad에서는 웹페이지가 홈 화면 추가 창을 직접 실행할 수 없기 때문에 **Safari 공유 → 홈 화면에 추가** 순서를 화면에서 안내합니다.

## Windows 프로그램과의 관계

Dials v0.6.0은 **HJU Phonebook V0.24.1 build69**의 `.dials` schema 1.2를 지원하며, 기존 schema 1.1 파일도 계속 읽습니다.

현재 규격은 다음과 같습니다.

- 확장자: `.dials`
- 외부 포맷: `DialsEncryptedData`
- 포맷 버전: `1`
- 암호 키 파생: PBKDF2-HMAC-SHA256, 310,000회
- 암호화: AES-256-GCM
- payload 스키마: `1.2` (`1.1`도 읽기 호환)
- 외부번호 표시: `externalNumber: true`이면 전체 번호 뒤에 `(외부번호)` 표시
- 동일인 식별: 실제 DB ID가 아닌 비표시 `personKey`
- 소속 및 인물 순서: Windows의 시트1 출력순서

Dials는 Windows 관리용 SQLite DB를 직접 읽지 않습니다. 관리 프로그램이 조회에 필요한 데이터만 추려 만든 `.dials` 파일을 읽습니다.

상세 규격은 [`docs/DIALS_DATA_FORMAT.md`](docs/DIALS_DATA_FORMAT.md)를 참고하세요.

## GitHub Pages 배포

별도의 빌드 과정이 없는 정적 웹앱입니다.

1. 이 파일들을 `Bak2ya/Dials` 저장소 루트에 업로드합니다.
2. GitHub에서 **Settings → Pages**로 이동합니다.
3. **Deploy from a branch**를 선택합니다.
4. `main` 브랜치와 `/ (root)`를 선택합니다.
5. 배포 완료 후 아래 링크에서 실행합니다.

🌐 <a href="https://bak2ya.github.io/Dials/" target="_blank" rel="noopener noreferrer">https://bak2ya.github.io/Dials/</a>

모든 리소스는 상대경로를 사용하여 `/Dials/` 프로젝트 경로에서 동작합니다.

## 새 전화번호부 데이터 배포

실제 운영 `.dials` 파일은 **공개 GitHub 저장소에 올리지 않습니다.** 기관 내부 게시판 등 기존 비공개 배포 경로를 통해 별도로 전달합니다.

Dials는 공개 서버에서 최신 버전 여부를 별도로 조회하지 않습니다. 사용자는 연결 화면과 전화번호부 데이터 정보에서 `.dials` 파일 자체에 포함된 **기준일(`dataVersion`)**을 확인할 수 있습니다. 새 전화번호부가 배포되면 `⋯ → 새 데이터 불러오기`로 교체합니다.

## 연락처 저장

`⋯ → 연락처 저장`에서는 `행정부서 / 학과 / 기타시설`부터 시작해 필요한 소속만 단계적으로 펼쳐 사람을 선택할 수 있습니다. 펼침/접힘은 왼쪽, 선택 체크박스는 오른쪽으로 분리되어 있으며, 주요 소속/하위 소속 전체 선택과 일부 선택(혼합 상태)을 지원합니다. 여러 소속에 함께 등장하는 동일 인물의 체크 상태는 서로 동기화됩니다. **다중소속 인물은 vCard에 중복 저장되지 않습니다.**

저장 항목은 다음 중 선택합니다.

- 이름: 항상 포함
- 개인번호
- 내선번호
- 소속
- 직책 / 역할

필요하면 이름 앞과 뒤에 원하는 문자열을 붙일 수 있습니다. 예시 입력은 앞 `직장`, 뒤 `교수`이며, 공백과 기호를 포함해 사용자가 입력한 문자열을 그대로 사용합니다. 앞/뒤 문자열은 vCard 생성 시에만 적용되고 Dials 원본 데이터의 이름은 변경하지 않습니다.

생성되는 모든 연락처의 메모에는 선택 여부와 관계없이 다음 정보가 항상 들어갑니다.

```text
Dials
데이터 기준일: YYYY-MM-DD
```

따라서 나중에 휴대폰 연락처를 확인할 때 어느 날짜의 전화번호부에서 가져온 정보인지 확인할 수 있습니다.

## 개인정보 및 보안 구조

- GitHub 저장소에는 **조회용 웹앱만** 둡니다.
- 실제 이름, 개인번호, 내선번호, 소속 데이터, 운영 암호, 암호화 키, Windows 관리 DB, 운영 `.dials` 파일은 저장소에 포함하지 않습니다.
- 연결한 암호화 `.dials` 패키지는 편의를 위해 브라우저 IndexedDB에 저장할 수 있습니다.
- 데이터 암호는 저장하지 않습니다.
- 복호화된 전화번호부는 브라우저 영구 저장소에 저장하지 않습니다.
- `잠금`을 누르면 페이지를 다시 불러와 현재 페이지 메모리에 있는 복호화 데이터를 내려놓습니다.
- 잠금 해제 후 10분이 지나면 자동으로 같은 잠금 상태로 돌아가며, 복호화 데이터와 선택/검색 상태가 함께 내려갑니다.
- CSP는 페이지가 필요로 하지 않는 외부 스크립트·외부 통신·프레임/플러그인 경로를 제한합니다. GitHub Pages의 정적 배포 특성상 문서의 `<meta http-equiv="Content-Security-Policy">`로 적용합니다.
- 암호 실패 지연 기록은 암호화 패키지의 SHA-256 지문별로 **현재 브라우저의 IndexedDB에만** 저장됩니다. 파일명을 바꾸거나 같은 브라우저를 다시 열어도 이어지지만, 다른 브라우저/기기에는 공유되지 않습니다.
- 브라우저 간 실패 기록 공유는 중앙 서버가 필요해 로컬 우선 설계와 충돌하므로 의도적으로 적용하지 않습니다. 이 제한은 Dials 화면에서의 반복 입력을 늦추는 보조장치이며 오프라인 공격 방어를 대신하지 않습니다.

---

# English

**Web-based contact viewer with separately distributed local data files**

🌐 <a href="https://bak2ya.github.io/Dials/" target="_blank" rel="noopener noreferrer">Open Dials</a>

Dials is a lightweight, responsive contact viewer. The web app and the actual contact directory are distributed separately: users import an encrypted `.dials` file generated by the Windows management program, and that encrypted package is kept locally in the browser for later use.

## Core flow

1. Open Dials in a browser or from a home-screen icon.
2. Import a distributed `.dials` data file once.
3. Enter the data password on the same connection screen.
4. Search by name, organization, extension, or mobile number, or browse by organization.
5. On later visits, the previously connected encrypted file is reused; only the password is required again.

## Features

- Responsive viewer for iPhone, iPad, Android, Windows, and macOS browsers
- Final Dials icon applied consistently to the web header, PWA, and iPhone Home Screen icon
- Fixed iOS file-picker compatibility for custom `.dials` files
- System/light/dark/Black(OLED) appearance selector, with system mode as the default
- House Palette themes: warm-neutral Light, developer-neutral Dark, and true-black OLED
- `⋯ → 정보` About/privacy view with current version and GitHub link
- `⋯ → Add shortcut` flow using the browser install prompt when available, with iPhone/iPad home-screen instructions as fallback
- Local encrypted `.dials` import and IndexedDB reuse
- Password never stored by Dials
- The same encrypted `.dials` package is identified by a SHA-256 fingerprint even if its filename changes, so unlock-failure count and retry delay persist within the current browser
- Retry backoff begins after the fourth failed password attempt: 10 seconds → 30 seconds → 1 minute → 5 minutes → up to 15 minutes
- A restrictive Content Security Policy (CSP) limits external scripts, external connections, frames/plugins, and other unused execution paths
- Decrypted contact data kept only in the active page memory
- Fixed 10-minute auto-lock measured from unlock time, with expiry rechecked when returning from the background
- Unified multi-keyword AND search
- Organization browsing in the exact order supplied by the Windows exporter
- Search results grouped by `personKey`, so one person with multiple affiliations appears once
- Same-name people remain separate when their `personKey` differs
- Tap-to-call phone numbers
- Numbers marked as non-extension-callable by HJU Phonebook are shown with **`(외부번호)`** while keeping the full number callable
- Contact export uses an expandable category → major organization → child organization → person disclosure tree
- Organization-wide selection with mixed/partial checkbox state
- Multi-affiliation people share one `personKey` selection and are exported only once
- Dedicated multi-select vCard (`.vcf`) contact-export screen
- Selectable standard vCard fields: mobile, extension, and company/organization
- Contact-selection rows omit repeated phone numbers and focus on name + representative job/affiliation button + person checkbox
- A per-person representative button chooses at most one department + title/role for standard contact fields; leaving all representative buttons off is supported
- Optional literal contact-name prefix and suffix, with independent saved values
- Memo content is independently selectable: data-version date, all affiliations, and all titles/roles
- Offline app-shell support after the first successful visit
- No analytics, ads, external APIs, CDNs, or remote contact-data upload


## v0.6.0 representative contact fields, memo options, and scroll/layout cleanup

- The main content width on large screens now follows the same maximum width as the start/connection screen instead of stretching across wide monitors.
- The password field now includes an inline eye/eye-off control. Toggling visibility keeps the value and caret/selection, and new locked/replacement states start hidden again.
- The JavaScript `no-page-scroll` lock/unlock mechanism introduced for short pages was removed. Dials now relies on native document scrolling, eliminating an intermittent contact-export scroll lock caused by disclosure-animation/viewport timing.
- The thin divider between an expanded card header and its revealed body is removed in both browsing and contact export; existing internal spacing remains.
- Contact export removes the redundant `저장할 사람` subheading and hides phone numbers from selection rows. Rows focus on **name + compact representative job button + right-side person checkbox**.
- A representative job button (for example `처장` or `교수`) selects that affiliation's department and title/role for the standard vCard fields. At most one representative affiliation can be active per `personKey`; choosing a different one asks for confirmation, and the active one can be toggled off to save no representative department/title.
- `직장 / 기관` is a separate global option. The organization name is derived from the directory title (for example `혜전대학교`); with a representative department, vCard `ORG` is emitted as `organization;department`, while the representative job is emitted as `TITLE`.
- The old affiliation/title export controls and always-on memo notice are replaced by a `메모에 기록할 내용` sub-card with independent options for the data-version date, all affiliations, and all titles/roles. This keeps rich multi-affiliation context in `NOTE` while allowing the standard contact fields to stay concise.
- The `.dials` package/schema is unchanged. Existing `personKey` de-duplication, CSP, unlock backoff, fixed 10-minute auto-lock, IME-safe search, History/Back, safe data replacement, and v0.5.5 Safari/name-affix behavior are preserved.

## v0.5.5 iPhone contact-file download compatibility and name affixes

- On iPhone/iPad WebKit, client-generated vCard Blob downloads can be rejected. Dials now re-wraps the vCard only on iOS-like browsers as `application/octet-stream` while preserving the `.vcf` filename; other browsers keep the existing `text/vcard` download path.
- Contact export now supports both a literal prefix and a literal suffix around the name. Example placeholders are `직장` and `교수`.
- Dials no longer inserts or trims spacing for these fields: the exact strings typed by the user are concatenated around the contact name.
- Prefix/suffix enabled states and values are remembered independently, and the combined result is previewed using `박주성`.

## v0.5.4 no persistent background emphasis for disclosure state

- Expanded browse/contact-export nodes no longer rely on a persistent background highlight. Expansion is communicated by the chevron direction and the revealed children.
- To avoid touch browsers making a tapped disclosure look selected because `:hover` can linger after a tap, tree-row hover backgrounds now apply only to hover-capable fine pointers such as a mouse or trackpad.
- Contact-export selection remains represented only by the right-side checkbox/mixed state, keeping selection and disclosure visually separate.
- Hierarchy, palette tokens, disclosure animation, selection behavior, data handling and security behavior are unchanged.

## v0.5.3 expanded-card background continuity

- In both normal browse and contact export, an expanded parent now keeps the same background color through its revealed child area instead of switching the body to a different tint.
- Hierarchy, spacing, borders, animation and selection behavior are unchanged from v0.5.2; this patch adjusts background continuity only.

## v0.5.2 nested hierarchy cards and disclosure motion

- Normal browse and contact export now use the same nested-card hierarchy grammar.
- Child organizations no longer consume large horizontal indentation; expanding a parent grows that card and reveals child cards inside it.
- Existing House palette tokens are reused: top-level Surface, nested organization Secondary Surface, then spacing/borders/typography for deeper levels instead of inventing extra colors.
- Expand/collapse uses a short ~180ms CSS grid-row/opacity transition and respects `prefers-reduced-motion`; there is no continuous rendering loop.
- Contact export keeps disclosure on the left and the stable checkbox lane on the right, including mixed selection, `personKey` synchronization and vCard de-duplication.

## v0.5.1 unified disclosure tree for browsing

- The main browse screen now uses the same progressive disclosure hierarchy as contact export.
- It starts with only the top-level categories collapsed, then expands category → major organization → child organization as needed.
- People directly attached to a major organization appear before its child departments at the same hierarchy level; expanding a child department reveals its contacts.
- The browse screen has no selection checkboxes; it shares only the organization hierarchy and ordering with contact export.
- The redundant `소속별 조회` heading was removed and the helper copy is now `소속을 선택하거나 검색창에서 바로 찾아보세요.`
- Existing search, phone links, external-number labels, History/Back, and IME-safe input behavior remain unchanged.

## v0.5.0 security hardening, password backoff, and start-screen cleanup

- Added a restrictive Content Security Policy (CSP). The page permits only the same-origin scripts/styles/PWA resources it needs, allows the existing embedded data-image texture, and blocks page-level fetch/XHR/WebSocket connections with `connect-src 'none'`.
- Moved the early theme initializer from inline JavaScript to `theme-init.js`, allowing `script-src 'self'` without `unsafe-inline`.
- Dials now fingerprints the encrypted package fields with SHA-256. Renaming the same `.dials` file does not reset its browser-local unlock-failure state. The fingerprint does not contain the plaintext directory or the password.
- Attempts 1–2 can retry immediately. The third failure warns that the next failure will trigger a 10-second delay. From the fourth failure onward the backoff is 10 seconds → 30 seconds → 1 minute → 5 minutes → 15 minutes. A successful unlock clears the fingerprint's failure state.
- Browser-to-browser/device-to-device failure sharing was considered and intentionally not implemented: it would require a central shared service and conflict with Dials' local-first/no-contact-upload model. The UI delay is only an auxiliary local control; the encrypted file, KDF, and password strength remain the protection against offline guessing.
- The start-screen tagline was moved out of the header into a quiet footer together with the live app version. The three usage steps were shortened accordingly.

## v0.4.2 contact-export disclosure tree and selection grammar

- Contact export now uses one expandable disclosure tree instead of repeatedly navigating into separate category/organization pages.
- The initial state shows only top-level categories, all collapsed. Expanding a category shows major organizations; expanding a major organization shows direct major-level people first and child departments at the same depth; expanding a child department shows its people.
- Familiar interaction grammar is restored: disclosure/navigation is on the left, while selection checkboxes are isolated on the right. Expanding never changes selection and checking never expands a row.
- Major-organization and child-organization checkboxes select the unique people in their subtree and show the native mixed state for partial selection. Multi-affiliation people continue to share one `personKey` selection.
- The normal viewer no longer displays the implementation-oriented Sheet1-order explanation, while still preserving source order internally.
- Search results use the same right-side selection grammar.
- Successful unlock starts soft-keyboard/visual-viewport settling before directory preparation/rendering to further protect the first overflow-menu tap on mobile.

## v0.4.1 mobile first tap, safe replacement, overflow, and contact hierarchy

- Unlock now explicitly releases password focus and allows a likely mobile keyboard/visual-viewport transition to settle before the main viewer is shown, targeting the first-tap overflow-menu issue observed on iPhone. Real-device validation remains necessary.
- `⋯ → 새 데이터 불러오기` returns to the initial data-connection screen. A new encrypted package replaces the stored package only after successful decryption, preserving the last known-good package if selection is cancelled or validation fails.
- Root scrolling/overscroll is suppressed only when the current page is shorter than the viewport; long pages continue to scroll normally.
- In contact-export hierarchy browsing, people assigned directly to a major organization are expanded inline beside child department rows when both exist, preserving source order and the shared `personKey` selection model.

## v0.4.0 contact export navigation, auto-lock, and clearer privacy UI

- Contact export now follows the same category → organization → person hierarchy as the main viewer instead of showing one very long list.
- Organization-level checkboxes select all people in that organization and show a mixed state when only some are selected.
- The same `personKey` shares selection across multiple affiliations and search results, and each person is written to the VCF only once.
- Contact-selection rows are more compact on mobile.
- Dials auto-locks 10 minutes after unlock, regardless of interaction; the expiry is rechecked when a suspended mobile browser returns to the foreground.
- The start screen has a clearer privacy/security notice and emphasizes the connected data date.
- About now presents user-facing privacy facts, while detailed encryption/storage information remains in the GitHub documentation.
- The public latest-data check and `data-status.json` dependency were removed; the viewer displays the `dataVersion` embedded in the connected `.dials` file.

## v0.3.2 mobile IME, touch targets, and About

- Search input is no longer coupled to repeated History updates while the mobile IME is composing. The browser owns the text field, while Dials debounces result rendering.
- The same IME-safe search behavior is used in the main viewer and Contact export.
- The top `⋯` control now has a 48×48px touch target, and overflow actions use at least 48px row heights.
- `⋯ → 정보` adds an About/privacy view with the current version and a GitHub link.
- The in-app privacy explanation stays user-facing; encryption algorithm details remain documented here and in `docs/DIALS_DATA_FORMAT.md`.
- Back/History, scroll restoration, accessibility, House Palette themes, OLED Black, and external-number behavior remain unchanged.

## v0.3.1 IME search input fix

- Search no longer rerenders while Korean, Japanese, Chinese, or other IME text is still being composed.
- The query and browser History are committed after `compositionend`, preventing the first composed character from disappearing or composition from being interrupted.
- Latin letters and numeric input still update immediately.
- v0.3.0 Back navigation, search History, scroll restoration, and OLED theme behavior remain unchanged.

## v0.3.0 navigation, accessibility, and OLED

- Browser/Android system Back now follows Dials internal navigation.
- Search adds only one history entry per search session; Back restores the previous view and scroll position.
- Contact export participates in browser history.
- Dialogs trap keyboard focus and restore it to the control that opened the dialog.
- The overflow list uses ordinary buttons instead of incomplete ARIA menu semantics.
- Appearance uses a real radio group and adds a true-black OLED mode alongside System/Light/Dark.
- Light/Dark/Black palettes now follow the shared House Palette.

## v0.2.0 external-number display

When HJU Phonebook marks a number as not reachable through the internal extension system, Dials keeps the full number callable and appends **`(외부번호)`** to its display. Schema 1.1 files without this field continue to behave as ordinary extension-callable numbers.

## iPhone / iPad data-file selection

Dials v0.1.2 fixes an iOS file-picker issue where the custom `.dials` extension could appear disabled and could not be selected. The web app no longer relies on the browser file-type filter. It allows file selection first and then validates the internal `DialsEncryptedData` wrapper itself.

This lets iPhone/iPad users select a distributed `.dials` file directly from Files or iCloud Drive. If the selected file is not a valid Dials package, the app reports the format error after selection.

## Appearance and shortcut

The overflow menu includes **Add shortcut** and **Appearance**. Appearance can follow the system setting or be fixed to Light, Dark, or Black (OLED). The themes follow the shared House Palette: warm-neutral Light, developer-neutral Dark, and true-black large surfaces for Black/OLED.

For installation, Dials uses the browser/PWA installation prompt when the platform exposes it. On iPhone/iPad, where a web page cannot directly trigger Home Screen installation, Dials shows the standard **Share → Add to Home Screen** instructions.

## Windows exporter compatibility

Dials v0.6.0 supports `.dials` schema 1.2 generated by **HJU Phonebook V0.24.1 build69**, while remaining compatible with schema 1.1 files.

Current format:

- Extension: `.dials`
- Wrapper: `DialsEncryptedData`
- `formatVersion`: `1`
- KDF: PBKDF2-HMAC-SHA256, 310,000 iterations
- Cipher: AES-256-GCM
- Payload `schemaVersion`: `1.2` (reader remains compatible with `1.1`)
- External-number marker: `externalNumber: true` adds `(외부번호)` to the displayed full number
- Person identity: opaque `personKey`
- Organization and person order: Windows Sheet1 output order

The Windows management database itself is not read by the web app and must not be distributed to Dials users.

See [`docs/DIALS_DATA_FORMAT.md`](docs/DIALS_DATA_FORMAT.md) for the package format.

## GitHub Pages

This repository is a static web app and requires no build process.

1. Upload the repository files to `Bak2ya/Dials`.
2. Open **Settings → Pages** in GitHub.
3. Choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`.
5. After deployment, open the link below.

🌐 <a href="https://bak2ya.github.io/Dials/" target="_blank" rel="noopener noreferrer">https://bak2ya.github.io/Dials/</a>

All app asset paths are relative, so the app works from the `/Dials/` project path.

## Publishing a new contact-data version

Actual `.dials` files must **not** be uploaded to this public repository. Distribute them through the organization's private/internal channel.

Dials does not query a public service to decide whether a newer directory exists. The connection screen and data-info view display the **`dataVersion` embedded in the connected `.dials` file**. When a newer file is distributed, users replace it through the app's data-replacement action.

## Contact export

Contact export mirrors the main category → organization → person hierarchy. Organization-wide selection is supported, selection follows the shared `personKey` across multiple affiliations and search results, and one person is written to the generated VCF only once. Selection rows intentionally omit phone numbers. A compact per-affiliation job button can choose one representative department/title for the standard vCard fields, while the global company/organization option and memo-content options remain independent. Literal name-prefix/name-suffix options remain available.

## Privacy and security model

- GitHub Pages contains the viewer only.
- Real names, phone numbers, departments, operational passwords, encryption keys, Windows DB files, and operational `.dials` files are never committed.
- The imported encrypted package is stored in IndexedDB for convenience.
- The password is not saved.
- The decrypted payload is not written to persistent browser storage.
- Locking Dials reloads the page, releasing the decrypted payload from the active page state.
- Dials automatically locks 10 minutes after unlock and rechecks expiry when a mobile browser returns from the background.
- CSP restricts unneeded external scripts, page-level external network connections, frames/plugins, and other unused resource paths. On GitHub Pages it is applied with a document `<meta http-equiv="Content-Security-Policy">`.
- Password-failure state is stored only in the current browser's IndexedDB, keyed by a SHA-256 fingerprint of the encrypted package. Renaming the file or reopening the same browser does not reset it; another browser/device has separate storage.
- Cross-browser sharing of failure state is intentionally not implemented because it would require a central service and conflict with the local-first design. The delay is an auxiliary UI control, not a replacement for file encryption/KDF/password strength.

## Repository description

> Web-based contact viewer with separately distributed local data files
