# 맥 세션 인수인계 (Windows → macOS) — 계속 갱신되는 문서

> **이 문서의 목적**: Windows PC 와 맥 PC 가 다르다. Windows 쪽에서 코드를 고치고 릴리즈하면, **맥 쪽은 이 문서만 보고 따라와서 그대로 컴파일·시험**할 수 있어야 한다.
> **갱신 규칙**: Windows 세션은 **커밋·릴리즈할 때마다** 아래 "5. 동기화 기록" 맨 위에 항목을 추가하고, "2. 현재 상태"를 고친다. 맥 세션은 **맥에서 한 일을 6. 맥 → Windows 보고** 에 적는다. (둘 다 같은 파일 = `git pull` 로 주고받는다)
> 함께 읽을 것: `docs/DESKTOP_APP_MACOS.md`(맥 앱 작업 명세서·결정 사항), `docs/DESKTOP_APP.md`(Windows 앱 만든 법·함정), `CLAUDE.md`

## 1. 맥에서 코드 받는 법 (항상 같은 순서)
```bash
git clone https://github.com/designloves2/AI-One-Studio-Canvers.git   # 처음 한 번
cd AI-One-Studio-Canvers
git pull --ff-only origin main        # 매번: 최신 받기 (충돌 나면 중단하고 Windows 세션에 보고)
git log --oneline -5                  # 아래 "현재 상태"의 커밋과 같은지 확인
git tag --list 'v2.*' --sort=-creatordate | head -3
```
- 릴리즈 기준으로 맞추려면: `git checkout vX.Y.Z` (태그). 작업은 항상 `main` 최신에서.
- **맥에서 만든 변경은 `main` 에 직접 커밋·푸시하지 말고 브랜치(`mac/<주제>`)로 올린다** → Windows 세션이 확인 후 합친다(두 PC 가 같은 파일을 동시에 고치지 않게). 예외: 이 문서의 "6. 맥 → Windows 보고" 만 맥이 직접 `main` 에 커밋해도 된다.

## 2. 현재 상태 (Windows 세션이 매번 갱신)
| 항목 | 값 |
|---|---|
| 최신 커밋 (`main`) | `f3817ec` (2026-11-21) — 이 문서만 바뀐 커밋은 그 다음에 더 생길 수 있음. **기준은 `git log` 의 마지막 코드/릴리즈 커밋 = `5e95e13`(v2.36.1)** |
| 최신 릴리즈 태그 | `v2.36.1` — https://github.com/designloves2/AI-One-Studio-Canvers/releases/tag/v2.36.1 |
| `package.json` 버전 | 2.36.1 (`src-tauri/tauri.conf.json`·`Cargo.toml` 은 빌드 때 이 값으로 맞춰짐) |
| 맥 앱 코드 상태 | **미착수** — `docs/DESKTOP_APP_MACOS.md` 명세서만 있음. `src-tauri/` 는 아직 Windows 전용 코드(`node.exe`, PowerShell 사용) |
| 릴리즈에 올라가는 것 | Windows 만(`Canvers_<ver>_windows-x64.zip`, `Canvers_<ver>_x64-setup.exe`, `latest.json`) |
| 열린 결정 사항 | `DESKTOP_APP_MACOS.md` 11절 7개 중 **미답변**(Apple Developer 가입, Cloudflare 로그인 방식, 맥 실기/CI, 유니버설 여부 등) |

## 3. 맥에서 처음 한 번 준비 (명세서 6-1 요약)
1. **Xcode** 설치 후 `xcode-select --install`(명령줄 도구)과 `sudo xcodebuild -license accept`
2. Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` → `rustup target add aarch64-apple-darwin x86_64-apple-darwin`
3. Node(LTS) → `npm ci`
4. 확인: `rustc --version`, `node --version`, `npx tauri --version`(= `tauri-cli 2.x`)
5. 서명/공증/업데이트 키 환경변수는 **비밀**이다(저장소·채팅·로그에 쓰지 말 것). 값은 사용자가 맥의 키체인/비밀번호 관리자에 둔다. 목록은 명세서 6-2, 6-3.

## 4. 맥이 컴파일할 때 "무엇이 맥에 영향을 주는지" 판단표
Windows 세션이 5절 기록에 변경 파일마다 아래 분류를 적는다.
| 분류 | 의미 | 맥에서 할 일 |
|---|---|---|
| **A. 화면/서버 코드만** (`src/**`, `server-lib/**`, `serve.mjs`) | 원격 서버(Windows)에 반영되면 맥 앱은 **새 앱 빌드 없이** 바뀜(맥 앱은 원격 화면을 열기 때문) | 없음. 단 맥 웹뷰 시험 항목(명세서 7절)에 영향이 있으면 확인 |
| **B. 데스크톱 껍데기** (`src-tauri/**`, `scripts/prepare-app.mjs`, `scripts/release-app.mjs`) | 맥 앱 코드/설정이 바뀜 | `git pull` → 맥 빌드 → 명세서 7절 시험 |
| **C. 버전 올림 / 릴리즈** | 앱 버전·`latest.json` 이 바뀜 | 맥 앱도 같은 버전으로 다시 빌드·업로드(맥 업로드는 `latest.json` 을 **합쳐서**) |
| **D. 문서만** | 동작 변화 없음 | 읽기만 |
> 맥 앱(1단계)은 **원격 전용**이라, 대부분의 기능 수정(A)은 Windows 서버에 반영·재시작되면 맥에서도 즉시 보인다. 맥 빌드를 다시 해야 하는 건 B·C 뿐이다.

## 5. 동기화 기록 (Windows → 맥) — 최신이 위
> 항목 양식 (복사해서 맨 위에 추가):
> ```
> ### YYYY-MM-DD · 커밋 <해시> · 태그 <vX.Y.Z 또는 없음> · 분류 A/B/C/D
> - 요약: 한 줄(사용자가 보는 동작 기준)
> - 변경 파일: src-tauri/src/lib.rs, ...
> - 맥 할 일: (없음 | git pull 후 빌드/시험 항목 번호)
> - 주의: (맥에서 깨질 수 있는 부분, 시험 못 한 것)
> ```

### 2026-11-21 · 커밋 `f3817ec` · 태그 없음 · 분류 D
- 요약: 이 인수인계 문서(`MAC_HANDOFF.md`)와 "커밋마다 갱신" 규칙(`CLAUDE.md`) 추가.
- 변경 파일: `docs/MAC_HANDOFF.md`, `CLAUDE.md`
- 맥 할 일: 1절 순서로 `git pull` 후 이 문서를 읽고 시작.
- 주의: 코드 변경 없음. 문서만 바뀐 커밋은 이후 5절에 일일이 적지 않고, 코드·릴리즈 커밋만 적는다.

### 2026-11-21 · 커밋 `0303fa7` · 태그 없음 · 분류 D
- 요약: 맥 앱 작업 명세서 추가(원격 전용 얇은 앱, 서명·공증·업데이트·CI, 시험 항목, 결정 사항).
- 변경 파일: `docs/DESKTOP_APP_MACOS.md`
- 맥 할 일: 명세서 정독 → 11절 결정 사항을 사용자에게 확인.
- 주의: 코드 변경 없음.

### 2026-11-18 · 커밋 `5e95e13` · 태그 `v2.36.1` · 분류 B + C
- 요약: 앱이 비정상 종료돼 남은 서버(node.exe)가 업데이트 설치를 막던 문제 수정(시작할 때·업데이트 직전에 남은 서버 정리).
- 변경 파일: `src-tauri/src/lib.rs`(`kill_stale`, `start_server`), `CHANGELOG.md`, 버전 4곳
- 맥 할 일: 없음(이 코드는 **Windows 전용**: PowerShell·`node.exe`). 맥 앱은 서버를 띄우지 않으므로 `#[cfg(windows)]` 로 격리해야 함(명세서 4절 1항).
- 주의: 지금 `lib.rs` 는 `#[cfg]` 로 맥을 구분하지 않는다 → **맥에서 그대로 컴파일하면 `node.exe` 를 찾다가 실패**한다. 맥 작업 1순위.

### 2026-11-18 · 커밋 `3fb6017` · 태그 `v2.36.0` · 분류 A + B + C
- 요약: 노드 5dcc490 이식(H3 이미지 라이브 프리뷰, 갤러리 frames 분리 탭, 영상 포스터 캐시 키) + 데스크톱 앱 "연결 화면으로 돌아가기"(⇄ 버튼, Ctrl+Shift+K).
- 변경 파일: `src-tauri/src/lib.rs`(`SWITCH_JS`, `on_page_load`, 메뉴 항목), `src/backend/preview.ts`·`h3Image.ts`·`studio.ts`, `src/engine/run.ts`·`more.ts`, `src/registry/index.ts`, `src/panels/AssetsPanel.tsx`·`AssetDialog.tsx`, `src/director/DirectorView.tsx`, `src/i18n.cards.ts`
- 맥 할 일: ⇄ 버튼 이동 주소가 `http://127.0.0.1:8775/canvers/connect` 로 박혀 있다 → 맥(서버 없음)에서는 `tauri://localhost/connect.html` 로 바꿔야 함(명세서 3절 6항).
- 주의: 갤러리 탭·이미지 프리뷰는 실제 렌더/화면 확인 못 함(맥과 무관).

### 2026-11-18 · 커밋 `87baca9` · 태그 `v2.35.1` · 분류 B + C
- 요약: 앱 창을 하나로 고정(새 창을 요청하는 링크·로그인 팝업은 지금 창에서 열림).
- 변경 파일: `src-tauri/src/lib.rs`(창을 `setup` 에서 만들고 `on_new_window` 로 막음), `src-tauri/tauri.conf.json`(`app.windows: []`)
- 맥 할 일: 맥 웹뷰에서 팝업이 같은 창에서 열리는지 시험(명세서 7절 2번).
- 주의: 맥에서는 미검증.

### 2026-11-18 · 커밋 `b5c06e7` · 태그 `v2.35.0` · 분류 A + B + C
- 요약: **Tauri 설치형 앱 최초 릴리즈**(자동 업데이트, 로컬/원격 연결 화면, https 중계, 시스템 언어 따라가기), 입력 중 포커스 유실·휠 스크롤 수정.
- 변경 파일: `src-tauri/**`(신규), `scripts/prepare-app.mjs`·`release-app.mjs`(신규), `server-lib/connection.mjs`(신규), `serve.mjs`, `src/i18n.ts`, `src/canvas/Flow.tsx`, `src/ui/Controls.tsx`, `docs/DESKTOP_APP.md`, 버전 4곳
- 맥 할 일: 맥 앱의 출발점 — 위 코드를 맥용으로 갈라내는 것이 이번 작업(명세서 전체).
- 주의: 업데이트 서명 키(`C:\Users\desig\.tauri\canvers.key`)는 Windows PC 에만 있음 → 맥/CI 에서 업데이트 파일을 만들려면 사용자가 안전하게 옮겨야 함(명세서 6-3).

> (그 이전 릴리즈 2.34.0 이하는 `CHANGELOG.md` 참고 — 모두 분류 A, 맥 영향 없음)

## 6. 맥 → Windows 보고 (맥 세션이 쓰는 곳) — 최신이 위
> 항목 양식:
> ```
> ### YYYY-MM-DD · 맥 브랜치 <mac/주제> · 커밋 <해시>
> - 한 일 / 빌드 결과(성공·실패, 에러 앞부분) / 시험한 항목 번호와 결과
> - Windows 세션에 요청할 것(예: 이 파일 합쳐 주세요, 이 결정이 필요합니다)
> ```

_(아직 없음)_

## 7. 맥 세션이 지킬 것 (요약)
- 시작할 때 `git pull --ff-only` → 이 문서 2·5절을 읽고 **마지막으로 처리한 커밋** 이후 항목만 처리한다.
- 비밀(서명 키, Apple 인증서·암호, 업데이트 키)은 어디에도 기록하지 않는다. 저장소는 **공개**다.
- `src-tauri/` 를 고칠 때 **Windows 빌드가 깨지지 않게** 맥 전용은 `#[cfg(target_os = "macos")]` / `tauri.macos.conf.json` 으로만 분리한다(공통 파일을 맥 기준으로 바꾸지 말 것).
- 시험 못 한 것은 "못 함"이라고 정확히 적는다. 빌드 성공과 실행 확인은 다른 말이다.
- 버전 올림·태그·릴리즈는 **사용자가 시켰을 때만**(Windows 세션과 같은 규칙).

### 2026-11-21 · 맥 브랜치 `mac/desktop-app` · 맥 앱 1.0.0 (태그 `mac-v1.0.0`)
- 한 일: `macos/` 에 **Xcode 프로젝트(Swift + WKWebView)** 로 맥 앱을 만들었다(원격 전용, 연결 화면, 맥 메뉴, 한 창, 다운로드→~/Downloads, 업데이트 알림). Tauri/Rust 는 쓰지 않았다(맥에 Rust 없음). 버전은 맥 앱 독립 1.0.0, 릴리즈 태그는 `mac-vX.Y.Z`(Windows 의 `v2.x` 와 분리, `latest` 로 잡히지 않게 함 — Windows 자동 업데이트가 `latest.json` 을 읽기 때문).
- 시험: `xcodebuild` Debug/Release 빌드 성공, 실행, `canvers.tjtj.cloud` 입력 → Cloudflare 로그인 → Canvers 화면 열림, 재실행 시 로그인 유지 확인. **못 한 것**: 다운로드·영상 재생·한글 입력·단축키·⇄ 버튼, 서명·공증(지금은 ad-hoc 서명, 첫 실행은 우클릭 → 열기).
- Windows 세션에 요청: `DESKTOP_APP_MACOS.md` 의 "같은 Tauri 프로젝트" 방침과 달라졌다(Swift 앱). 방침 확인 필요. `src-tauri/` 는 건드리지 않았다.
