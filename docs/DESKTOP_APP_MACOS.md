# 맥(macOS) 데스크톱 앱 작업 명세서 — 원격 접속 중심

작성: 2026-11-21 · 대상 저장소: `AI-One-Studio-Canvers` · 기준 버전: 2.36.1 (Windows 설치형 완료)
함께 읽을 것: `docs/DESKTOP_APP.md`(Windows 앱 만드는 법·함정), `CLAUDE.md` 8절 "설치형 데스크톱 앱"

## 0. 한 장 요약
- **목표**: Windows에서 만든 Tauri 앱을 **같은 코드**로 맥에서도 `.app`(+ `.dmg`)로 만들고, **자동 업데이트**까지 같은 GitHub 릴리즈로 한다.
- **핵심 결정**: 백엔드(ComfyUI + Canvers 서버)는 **Windows 서버**에 있다. 그래서 맥 앱은 **"원격 접속 전용 얇은 앱"** 으로 만든다. 창이 원격 Canvers 주소(예: `canvers.tjtj.cloud`)를 직접 열고, 맥 안에서는 서버(Node)를 띄우지 않는다.
  - 이득: Node 실행 파일을 맥용으로 따로 넣지 않아도 되고(서명·공증·아키텍처 문제 제거), 작업물(프로젝트·캔버스·디렉터)은 Windows 서버 한 곳에 저장되어 두 OS가 같은 작업을 본다.
- **방식(사용자 지시)**: Windows 에서 만든 것과 **같은 Rust(Tauri) 프로젝트**를 맥에서 **Xcode 로 빌드**해 `.app` 으로 감싼다. 별도 Swift 프로젝트는 만들지 않는다(같은 코드·같은 업데이트·같은 연결 화면을 쓴다).
- **이 PC(Windows)에서는 맥 앱을 빌드·시험할 수 없다.** 코드 수정(조건부 컴파일)은 여기서 할 수 있지만, 빌드·서명·실행 시험은 **맥 한 대 또는 GitHub Actions 맥 러너**가 필요하다(8절).

## 1. 현재 Windows 앱 구조 (재사용할 것 / 바꿀 것)
| 파일 | 지금 하는 일 | 맥에서 |
|---|---|---|
| `src-tauri/src/lib.rs` | Node 서버 띄우기(`node.exe`), 창 만들기, 새 창 막기, ⇄ 버튼, 메뉴, 업데이트 확인 | 서버 띄우기·`kill_stale`·`plain()`은 **윈도우 전용**으로 격리. 창·업데이트·언어는 그대로 |
| `src-tauri/tauri.conf.json` | NSIS 설치 파일, `resources: bundle/` | 맥은 **`tauri.macos.conf.json`**(맥 전용 덮어쓰기)로 분리 |
| `scripts/prepare-app.mjs` | node.exe + serve.mjs + dist 를 `bundle/` 에 모음 | 맥(얇은 앱)에서는 **필요 없음** — 건너뛴다 |
| `scripts/release-app.mjs` | zip + 설치 파일 + `latest.json` 업로드 | `latest.json` 을 **덮어쓰지 말고 합치도록** 고친다 |
| `server-lib/connection.mjs` | 연결 화면·주소 자동 인식(Node가 처리) | 맥 얇은 앱에는 Node가 없으므로 **연결 화면을 앱 안 정적 페이지로** 대체(3절) |

## 2. 범위
**이번에 한다(1단계, 원격 전용)**
1. 맥에서 빌드되는 Tauri 앱(아이콘·이름·창) — `.app`, `.dmg`, 자동 업데이트용 `.app.tar.gz` + `.sig`
2. 원격 접속 연결 화면(로컬 없음), 저장, 다음 실행 자동 접속, "연결 바꾸기" 복귀
3. 맥 규칙 대응: 메뉴(복사/붙여넣기 포함), 창 닫기, 다운로드, 키보드, 한글 입력
4. 서명·공증, 맥 자동 업데이트, 릴리즈 파이프라인(Windows 와 같은 `latest.json` 공유)

**이번에 하지 않는다(2단계, 필요해지면)**
- 맥 안에서 서버(Node) 실행 · "이 PC의 ComfyUI"(로컬) · 맥에서 ComfyUI 주소로 직접 중계(= `connection.mjs` 의 proxy 모드)
- Mac App Store 배포, iOS/iPadOS

## 3. 연결 화면 — 맥은 "원격 전용"
Windows 앱은 연결 화면을 **앱 안 Node 서버**(`/canvers/connect`)가 돌려준다. 맥 얇은 앱은 Node 가 없으므로 다음처럼 한다.

1. **연결 화면 = 앱 안 정적 페이지**(`src-tauri/shell/connect.html`, 주소 `tauri://localhost/connect.html`). 언어는 지금처럼 "설정에서 고른 언어 → 없으면 시스템 언어(한글이면 한글, 아니면 영어)".
2. 입력: **접속 주소 한 칸**(도메인·터널 주소). "이 PC(로컬)" 카드는 **맥에서는 숨긴다**(원격 칸이 처음부터 펼쳐진 상태).
3. **자동 인식은 Rust 로 이식**(Tauri 명령 `probe_connection`, `reqwest`):
   - ① `GET {주소}/canvers/target` → JSON 에 `url` 이 있으면 **Canvers 서버**
   - ② 응답이 `302`(Cloudflare Access `/cdn-cgi/access` 로그인으로 이동)·`401/403` → **로그인 필요한 주소** → 그래도 창으로 열어 로그인하게 한다(Windows 와 같은 결론)
   - ③ 그 외·연결 실패 → 오류 문구(영/한)
   - 주소 정규화(`normalize`)는 `connection.mjs` 와 같은 규칙: 스킴이 없으면 `https://`, 사설 IP·`localhost`·`.local` 이면 `http://`.
   - ComfyUI 직접 주소(`/system_stats`)는 1단계에서 **지원하지 않는다**(안내 문구: "Canvers 서버 주소를 넣어 주세요").
4. 저장: Tauri 명령 `save_connection`/`load_connection` → `~/Library/Application Support/cloud.tjtj.canvers/connection.json` (`{mode:"remote", address}`). Windows 의 `start_url()` 읽기 로직을 그대로 쓴다.
5. 시작 순서: `connection.json` 있음 → 그 주소로 바로 이동 / 없음 → 연결 화면.
6. **⇄ 버튼(`SWITCH_JS`)의 이동 주소를 맥에서는 `tauri://localhost/connect.html` 로 바꾼다**(맥에는 `127.0.0.1:8775` 가 없다). 메뉴 항목 "연결 설정…"도 같은 주소로 `navigate`.
7. 서비스 토큰(Cloudflare Access)은 **창에서 로그인하는 방식만** 쓰므로 1단계에서는 칸을 두지 않는다.

> 코드 위치 제안: Windows 쪽은 `#[cfg(windows)]` 로 지금 그대로, 맥은 `#[cfg(target_os = "macos")]` 로 위 항목. 공통(`start_url`, 언어, 업데이트, 새 창 막기)은 공유한다.

## 4. Rust(`lib.rs`) 변경 목록
1. **서버 관련을 윈도우 전용으로 격리**: `start_server`(node.exe), `kill_stale`(PowerShell), `plain()`(`\\?\` 제거), `Server` 상태, 종료 시 `stop_server`. 맥 빌드에서는 **서버를 띄우지 않으므로** 컴파일에서 빼거나 no-op 으로 둔다. (`#[cfg(windows)]` 와 `#[cfg(not(windows))]` 두 구현 또는 `cfg!(windows)` 분기)
2. **메뉴(필수)**: 맥은 첫 메뉴가 "앱 이름" 메뉴여야 하고, **편집(Edit) 메뉴가 없으면 ⌘C/⌘V/⌘X/⌘A/⌘Z 가 웹뷰에서 동작하지 않는다.** 맥 전용 메뉴:
   - 앱 메뉴: 정보 · 연결 설정… (⇧⌘K) · 숨기기/다른 앱 숨기기 · 종료(⌘Q)
   - 편집: 실행 취소·다시 실행·잘라내기·복사·붙여넣기·모두 선택(기본 `PredefinedMenuItem`)
   - 창: 최소화·확대/축소·전체 화면
   - 문구는 지금처럼 `tr(앱, 한글, 영어)`.
3. **창 닫기 동작**: 맥 관례는 "창을 닫아도 앱은 계속". 1단계는 **창을 닫으면 앱 종료**(Windows 와 동일, 가장 단순)로 하고, Dock 아이콘 클릭으로 되살리는 `RunEvent::Reopen` 은 2단계로 미룬다. *(결정 필요: 11절 질문 3)*
4. **창 크기**: 기본 1440×900 은 작은 맥북에서 넘칠 수 있으니 `inner_size` 를 화면 크기에 맞게 줄이는 처리(맥 전용, 화면의 90%까지).
5. **`on_new_window` / `on_page_load` / 단일 실행(single-instance)** 은 맥에서도 지원되므로 그대로. 단, 맥에서 **로그인 팝업이 지금 창에서 열리는지** 시험한다(7절).
6. 업데이트 확인(`check_update`)은 그대로. 맥은 앱 교체형이라 `stop_server`/`kill_stale` 호출은 필요 없다(맥은 서버가 없음).

## 5. `tauri.macos.conf.json` (맥 전용 설정, 신규)
Tauri 2 는 `tauri.macos.conf.json` 이 있으면 맥 빌드에서 기본 설정에 **덮어쓴다**(Windows 빌드는 영향 없음).
```jsonc
{
  "bundle": {
    "targets": ["app", "dmg"],
    "resources": {},                       // Windows 의 bundle/ 리소스는 맥에 넣지 않는다
    "macOS": {
      "minimumSystemVersion": "11.0",
      "signingIdentity": null,             // 로컬 시험은 ad-hoc, 릴리즈는 CI 환경변수 APPLE_SIGNING_IDENTITY
      "hardenedRuntime": true,
      "entitlements": "entitlements.plist",
      "dmg": { "windowSize": { "width": 640, "height": 400 } }
    }
  }
}
```
- `entitlements.plist`(신규): 웹뷰 앱 기본(`com.apple.security.network.client` = 외부 접속). Node 를 넣지 않으므로 JIT 관련 권한은 **필요 없다**.
- 아이콘: `src-tauri/icons/icon.icns` 는 이미 있다.
- 업데이터 공개키·엔드포인트는 기본 설정 그대로(Windows 와 **같은 키 쌍·같은 `latest.json`**). 맥 전용 `installMode` 항목은 없다.
- **ATS(앱 전송 보안)**: 1단계는 `https://` 원격만 쓴다. 사설망 `http://` 주소를 허용하려면 `Info.plist` 에 `NSAppTransportSecurity > NSAllowsLocalNetworking`(또는 예외 도메인)이 필요하다 → 요청이 있을 때만 추가.

## 6. 빌드 · 서명 · 공증 · 릴리즈
### 6-1. 빌드 환경(맥 또는 CI)
- macOS 13+ · **Xcode**(설치 후 `xcode-select --install` 로 명령줄 도구가 잡혀 있어야 하고, 서명·공증은 Xcode 의 `codesign`·`notarytool` 을 쓴다) · Rust 설치 후 `rustup target add aarch64-apple-darwin x86_64-apple-darwin` · Node(`npm ci`)
- 명령(유니버설 = 애플실리콘+인텔 한 파일): `npm run build && npx tauri build --target universal-apple-darwin`
  - `npm run app:build` 는 Windows 용 `prepare-app.mjs`(node.exe 복사)를 부르므로, 맥용 스크립트 **`app:build:mac`** 를 `package.json` 에 추가한다(`prepare-app.mjs` 를 부르지 않음. 단 `tauri.conf.json`/`Cargo.toml` 버전 동기화만 하는 작은 단계는 유지).
- 결과: `src-tauri/target/universal-apple-darwin/release/bundle/{macos,dmg}/` — `AI ONE Studio Canvers.app`, `…_universal.dmg`, `…app.tar.gz`, `…app.tar.gz.sig`

### 6-2. 서명 · 공증 (배포용 필수)
- **Apple Developer Program 가입(유료) + "Developer ID Application" 인증서**가 필요하다. 없으면 Gatekeeper 가 막아서 사용자가 **우클릭 → 열기**(또는 시스템 설정 → 개인정보 보호 및 보안 → "그래도 열기")를 해야 한다.
- 환경변수(전부 비밀 — 저장소·로그에 넣지 말 것): `APPLE_SIGNING_IDENTITY`, `APPLE_CERTIFICATE`(p12 base64)·`APPLE_CERTIFICATE_PASSWORD`(CI 용), 공증용 `APPLE_ID`+`APPLE_PASSWORD`(앱 전용 암호)+`APPLE_TEAM_ID` 또는 App Store Connect API 키(`APPLE_API_KEY`, `APPLE_API_ISSUER`, `APPLE_API_KEY_PATH`)
- Tauri 가 서명 → 공증 → 스테이플까지 한 번에 처리한다. 확인: `spctl -a -vv "…app"` = accepted / `xcrun stapler validate`.

### 6-3. 업데이트 서명 키
- **Windows 와 같은 minisign 키**(`canvers.key` + 암호)를 맥 빌드 환경에도 `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` 로 준다(공개키가 같아야 이미 배포된 앱이 맥 업데이트도 검증). 키는 **CI 비밀/비밀번호 관리자**로만 옮기고 채팅·저장소에 붙이지 않는다.

### 6-4. `latest.json` 합치기 (Windows 와 한 파일 공유)
지금 `release-app.mjs` 는 `latest.json` 을 **새로 써서 덮어쓴다** → 맥에서 올리면 Windows 항목이 사라진다. 고칠 점:
- 올리기 전에 해당 릴리즈의 기존 `latest.json` 을 내려받아 `platforms` 를 **합친다**(같은 버전일 때만 합치고, 다른 버전이면 새로 만든다).
- 맥 항목: `darwin-aarch64` 와 `darwin-x86_64` **둘 다** 같은 `.app.tar.gz` 주소·서명을 가리킨다(유니버설 한 파일).
  ```json
  "darwin-aarch64": { "signature": "<.sig 내용>", "url": ".../Canvers_<ver>_macos-universal.app.tar.gz" },
  "darwin-x86_64":  { "signature": "<.sig 내용>", "url": ".../Canvers_<ver>_macos-universal.app.tar.gz" }
  ```
- 에셋 이름은 공백 없이: `Canvers_<ver>_macos-universal.dmg`, `Canvers_<ver>_macos-universal.app.tar.gz`
- 릴리즈 받는 쪽(사용자)용 파일 = **`.dmg`**. (Windows 는 zip.)
- 순서 문제: Windows 와 맥을 **서로 다른 기계**에서 올리므로 `--clobber` 와 "합치기"가 겹치지 않게, 맥 업로드 스크립트는 항상 **기존 `latest.json` 먼저 읽기 → 합치기 → 올리기**.

### 6-5. CI (권장 — 맥이 없어도 됨)
`.github/workflows/release-mac.yml`(신규, **수동 실행** `workflow_dispatch` + 입력 `tag`):
1. `macos-latest` 러너, 해당 태그 체크아웃, Node·Rust(두 타깃) 설치
2. `npm ci` → `npm run build` → `npx tauri build --target universal-apple-darwin`
3. 서명·공증 비밀을 GitHub Secrets 로 주입(6-2, 6-3의 이름들)
4. `node scripts/release-app.mjs --mac`(합치기 포함)로 `.dmg`·`.app.tar.gz`·`latest.json` 을 그 태그 릴리즈에 업로드
- 저장소는 **공개**이므로 비밀은 반드시 Secrets 로만. 포크 PR 에서는 실행되지 않게 `workflow_dispatch` 만 쓴다.

## 7. 맥 웹뷰(WKWebView) 때문에 확인할 것 — 시험 항목
Windows(WebView2=Chromium)와 엔진이 달라 **눈으로 확인**이 필요한 것들. 문제가 나면 오른쪽 대응을 한다.
| # | 항목 | 확인 방법 | 안 되면 |
|---|---|---|---|
| 1 | **Cloudflare 로그인 후 화면 열림 · 로그인 유지** | 앱 재실행 후 로그인 없이 열리는지 | 쿠키 저장소가 영구인지 확인. **Google 계정 로그인을 쓰는 Access 정책이면 내장 웹뷰 로그인이 Google 정책으로 막힐 수 있다**(`disallowed_useragent`) → Access 를 **일회용 PIN/이메일** 로그인으로 바꾸거나 서비스 토큰 사용 |
| 2 | 로그인 팝업·`target=_blank` 가 한 창에서 열림 | 로그인 화면 이동 | `on_new_window` 동작 확인(맥 지원) |
| 3 | **파일 내려받기**(갤러리 ⭳, 결과 다운로드, ZIP 내보내기 — Blob/`download` 속성 사용) | 이미지·영상·ZIP 각각 저장 | 맥 웹뷰는 `<a download>` 를 무시할 수 있다 → Tauri 다운로드 핸들러(`on_download`)로 `~/Downloads` 에 저장하도록 추가 |
| 4 | 영상 재생(소리 포함, 자동 재생·전체 화면), 이미지 라이트박스 | 결과 영상 재생 | 자동 재생 정책(음소거 시작)·MP4/H.264 만 사용 중인지 확인 |
| 5 | **한글 입력**(조합 중 글자 끊김/포커스 유실 — 2.34~ 수정분이 맥에서도 안전한지) | 프롬프트·메모 카드에 한글·영어 입력 | `ImeTextarea` 동작 재확인 |
| 6 | 키보드 단축키(⌘S 저장, ⌘C/V 카드 복사, ⌘Z, ⌘D, ⌘G) | 캔버스에서 | `App.tsx` 는 이미 `ctrlKey \|\| metaKey` 를 받는다(확인됨). 메뉴의 편집 항목과 충돌 여부만 확인 |
| 7 | **트랙패드/휠**: 필드 위 스크롤 우선(2.35.x 수정) · 캔버스 두 손가락 이동/핀치 확대 | 긴 프롬프트 필드, 빈 캔버스 | 두 손가락 스크롤이 확대로 동작하면 `Flow.tsx` 의 `panOnScroll` 설정을 맥에서만 조정 |
| 8 | 창 이동(상단바 드래그)·크기·전체 화면 | 직접 사용 | 제목 표시줄 겹침이면 창 스타일 조정 |
| 9 | 클립보드 붙여넣기(이미지 붙여넣기) | 이미지 복사 후 ⌘V | 권한 프롬프트 여부 확인 |
| 10 | 첫 실행(공증 전·후 Gatekeeper), `.dmg` 설치, `/Applications` 에서 업데이트 교체 | 새 계정에서 설치 | 업데이트 교체 실패 시 앱 위치 권한(관리자 설치) 확인 |
| 11 | 자동 업데이트 | 낮은 버전 설치 → 높은 버전 릴리즈 → 실행 | `latest.json` 의 `darwin-*` 항목·서명 확인 |

## 8. 역할 분담 (누가 무엇을)
| 일 | 이 Windows 세션(Claude) | 맥/CI 필요 |
|---|---|---|
| `lib.rs` 조건부 컴파일, 맥 메뉴, 연결 화면(`connect.html`)·`probe_connection`·저장 | ✅ 작성 가능(Windows 빌드가 깨지지 않는지는 `cargo check` 로 확인) | 맥 컴파일 확인은 맥/CI |
| `tauri.macos.conf.json`, `entitlements.plist`, `app:build:mac`, `release-app.mjs` 합치기, CI 워크플로 | ✅ 작성 가능 | 실제 실행은 맥/CI |
| 빌드·서명·공증·실행 시험, 7절 시험 전부 | ❌ | **맥 또는 CI + 사용자 눈 확인** |
| Apple Developer 가입, 인증서·비밀 등록 | ❌ | **사용자** |

## 9. 완료 기준 (Acceptance)
1. 맥에서 `.dmg` 를 열어 앱을 `/Applications` 에 넣고 실행 → 연결 화면(영어/한글은 시스템 언어, 설정에서 고른 언어 우선)이 뜬다.
2. 주소(예 `canvers.tjtj.cloud`) 입력 → 로그인 필요 안내 → 창에서 Cloudflare 로그인 → Canvers 화면이 **같은 창**에서 열린다.
3. 앱을 껐다 켜면 로그인 없이 바로 열린다. ⇄ 버튼·⇧⌘K 로 연결 화면에 돌아가 주소를 바꿀 수 있다.
4. 복사·붙여넣기·한글 입력·파일 내려받기·영상 재생(7절 1~9)이 동작한다.
5. 높은 버전 릴리즈 후 앱 실행 시 업데이트 안내 → 설치 → 재시작으로 새 버전이 된다(Windows 앱도 같은 릴리즈로 계속 업데이트됨 = `latest.json` 에 양쪽 항목이 있다).
6. `spctl -a -vv` 로 공증 통과를 확인한다. Windows 빌드(`npm run app:build`)·`start.bat` 실행은 **전과 동일하게** 동작한다.

## 10. 작업 순서 제안
1. (여기서) 코드·설정·스크립트·CI 작성 → Windows 빌드 회귀 확인(`cargo check`, `npm run app:build`)
2. (사용자) Apple Developer 가입·인증서·앱 전용 암호, GitHub Secrets 등록, 맥 1대 준비(시험용)
3. (CI/맥) 서명 없는 시험 빌드로 7절 시험 → 문제 수정 → 서명·공증 빌드
4. 2.37.0(기능 추가 = MINOR)로 릴리즈: Windows zip + 맥 dmg 가 한 릴리즈에 들어가고 `latest.json` 에 양쪽 항목

## 11. 결정이 필요한 것 (사용자에게 확인)
1. **맥 앱 = 원격 전용 얇은 앱(권장)** 으로 시작해도 되는지. (맥에서 로컬 ComfyUI·서버 실행이 필요하면 2단계 명세로)
2. **Apple Developer Program** 가입 여부·시기. 가입 전에는 서명 없는 시험 빌드까지만 가능하고, 배포본은 사용자가 "우클릭 → 열기"를 해야 한다.
3. 창을 닫을 때 **앱도 종료(권장, 1단계)** vs 맥 관례대로 Dock 에 남기기.
4. 지원 맥: 애플실리콘+인텔 **유니버설(권장)** vs 애플실리콘만(파일이 작아지고 빌드 단순).
5. **Cloudflare Access 로그인 방식**(Google 계정 / 일회용 PIN / 기타). Google 계정이면 맥(내장 웹뷰)에서 막힐 수 있어 7절 1번 대비가 필요하다.
6. 맥 시험기(실제 맥)를 쓸 수 있는지, 아니면 **GitHub Actions 맥 러너**로만 진행할지.
7. 맥 릴리즈 다운로드 파일 형식: `.dmg`(권장) vs `.zip`.

## 12. 웹 세션(`AI-ONE-STUDIO`)에 전달할 때
- 이 문서의 3·4·5·6·7절은 앱 이름·포트·식별자(`cloud.tjtj.canvers`)·연결 경로(`/canvers/*` → 웹은 `/aos/*`)만 바꾸면 그대로 쓸 수 있다.
- 서명·공증·`latest.json` 합치기·CI 는 **저장소가 달라도 같은 방식**이므로 한 번 만든 워크플로를 복사한다. 단, 업데이트 서명 키는 **저장소마다 따로** 만든다.
