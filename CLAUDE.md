# CLAUDE.md — AI ONE Studio Canvers

다른 모델(Claude 가 아닌 모델 포함)이 이 저장소를 이어받아 바로 작업하기 위한 안내서입니다.
상세는 기존 문서로 연결하고, 여기에는 규칙과 지도만 둡니다. 확실하지 않은 것은 "확인 필요"로 표시했습니다.

## 1. 이 저장소는 무엇인가
- **노드 카드 캔버스(React 18 + Vite 6 + TypeScript, @xyflow/react, zustand) 웹 프론트엔드.** 생성·LLM 은 전부 ComfyUI 위의 `ComfyUI-TJ_NODE_STUDIO_ONE` 라우트를 호출한다. 이 저장소에 모델·GPU 코드는 없다.
- 4개 저장소 관계
  - `ComfyUI-TJ_NODE` — 메인 코어(노드 모음, LLM 구현체).
  - `ComfyUI-TJ_NODE_STUDIO_ONE` — 원노드 방식 UI + 서버 라우트(`nodes.py`). **이 앱의 백엔드이자 기능 기준(source of truth).**
  - `AI-ONE-STUDIO` — 원스튜디오 기반 웹앱(웹 쌍둥이).
  - **`AI-One-Studio-Canvers` (이 저장소)** — 원스튜디오 기반 웹앱, 지능형 캔버스형(카드를 선으로 연결).
- 사용자는 비개발자 디자이너다. 설명은 쉬운 말로, 전문 용어 없이 한다.

## 2. 먼저 읽을 문서 (순서)
1. `docs/HANDOFF.md` — 방향, 완료 기능, 개발 메모, 라이선스 결정. 옛 인수인계 문서라 일부 낡았음(이력 참고용, 최신은 CHANGELOG).
2. `docs/ARCHITECTURE.md` — 구조, 사용하는 백엔드 API 표, 코드 지도.
3. `CHANGELOG.md` — 최근 항목부터. 최신 동작은 여기가 가장 정확하다.
4. `README.md` — 사용법, LLM 설정, 실행 방법.
5. 노드 저장소의 `SPEC_RELAY_V*.md` (예 `SPEC_RELAY_V1_49_2.md`) — 노드가 바뀔 때마다 오는 이식 명세.
   위치: `C:\AI\ComfyUI-Easy-Install\ComfyUI\custom_nodes\ComfyUI-TJ_NODE_STUDIO_ONE\` (이 PC 기준).
- `PORT_LEDGER.md` 는 이 저장소에 없다. 포팅 기록은 `CHANGELOG.md` 의 "노드 vX.Y.Z" 항목에 있다.

## 3. 디렉터리와 핵심 파일
- `src/registry/index.ts` — 카드(노드) 정의: 포트, 파라미터, 엔진. **새 카드는 여기부터.**
- `src/engine/run.ts` 그래프 실행기 · `engine/actions.ts` 실행/중지/복구 · `engine/more.ts` 카드별 runner(`EXTRA_RUNNERS`) · `engine/ppLat.ts` 후처리 업스케일.
- `src/backend/` — ComfyUI 그래프 빌더와 API 클라이언트: `comfy.ts`(큐·진행률·실행 계획 복구), `h3.ts`, `ltx.ts`, `h3Lat.ts`, `post.ts`, `llm.ts`, `translate.ts`, `bilingual.ts`, `liveCanvas.ts`, `liveCombos.ts`, `assetlib.ts` …
- `src/canvas/` 캔버스·카드 UI · `src/ui/` 공용 컨트롤(`Controls.tsx`, `refine.tsx`, `dialog.tsx`) · `src/panels/` 설정·갤러리·라이브러리 · `src/simple/` 심플 모드.
- `src/i18n.cards.ts`(카드 문구 한글 사전), `src/i18n.ts`, `src/decks*.ts`(스타터/제작 덱), `src/types.ts`.
- `serve.mjs` — 운영 서버: `dist/` 서빙 + ComfyUI 프록시(`/canvers/target`). `server-lib/`, `mcp/`(MCP 서버, `server.ts` → `server.mjs` 빌드), `mock/`(가짜 ComfyUI), `canvases/`(저장된 캔버스), `dist/`(빌드 산출물, git 제외).
- `src/host/` — 옛 "원본 패널 통째로 불러오기". 기본 꺼짐, 코드만 남김. 새 기능에 쓰지 말 것.
- **Director Mode** (`src/director/`, 모드 3개: Director / Canvas / Simple. 상세·진행은 `docs/DIRECTOR_MODE_IMPLEMENTATION_PLAN.md`):
  - 사용자는 제작자이고 채팅(왼쪽)으로 지시, AI 작업팀이 결과(오른쪽)를 만들고 사용자는 승인/수정 지시. 양식 입력 화면이 아님.
  - 순수 로직(DOM·네트워크 없음, `scripts/test-director-*.mjs`로 시험): `types.ts`(스키마 3) `model.ts`(id·검증·마이그레이션 1→2→3) `workflow.ts`(전역 단계 + **편별** 진행선) `ai.ts`(작업팀 JSON 프로토콜·검사·적용) `series.ts`(클립 분할·해상도→MP) `compose.ts` `continuity.ts`(이전 작품 이어서 만들기) `adapter.ts`(Director→캔버스, 멱등) `execution.ts`(실행 모드·배치 계획·시드) `exportPackage.ts` `zip.ts` `localize.ts`.
  - 앱 쪽: `DirectorView.tsx`(화면) `DirectorPanel.tsx`(사이드 메뉴 프로젝트 목록) `canvasAction.ts`(캔버스 만들기·생성·ZIP·에셋 등록) `adapterRegistry.ts` `media.ts` `demoCrew.ts`(LLM 없는 시험용 작업팀) `../store/director.ts`(상태·작업 큐) `../backend/director.ts` + `server-lib/director.mjs`(저장 서버, `director/` 폴더·백업 10개, canvases와 분리) `../i18n.director.ts`.
  - 디렉터 전용 LLM 설정은 `store/settings.ts`의 `director`(4가지 백엔드 그대로, 설정 화면 + 채팅 입력창 왼쪽 아래 ⚙ 버튼).
- `graphify-out/` — 로컬 도구 데이터. 추적 안 함, 건드리지 말 것.

## 4. 실행 · 빌드 · 테스트 (package.json 확인됨)
- 설치+운영: `start.bat`(Windows) / `./start.sh` → `git pull --ff-only` → `npm install` → `npm run build` → `node serve.mjs` (포트 **8765**).
- 개발: `npm run dev`(vite). **사용자가 운영 서버(8765)를 쓰고 있으니 테스트는 다른 포트로:** `node node_modules/vite/bin/vite.js --port 8766 --strictPort`, 끝나면 반드시 종료.
- 타입 검사: `npm run typecheck` (= `tsc --noEmit`). 빌드: `npm run build`. MCP 빌드: `npm run build:mcp`.
- Director 시험: `npm run test:director` (6개 스크립트, GPU·ComfyUI 불필요). 브라우저 시험은 **데모 작업팀만**(아래 6절).
- `npm run mock`(MOCK 포트로 가짜 ComfyUI, GPU 없이 UI 시험). 자동 테스트 스위트는 없음(확인 필요: docs/HANDOFF.md 의 "mock e2e" 스크립트 위치).
- 실제 시험은 `127.0.0.1:8188` 의 진짜 ComfyUI 로 한다(docs/HANDOFF.md 방침). GPU 는 16GB 공유.

## 5. 코딩 · 문서 규칙 (이미 지키는 것)
- 주석·문구 밀도와 이름은 주변 코드에 맞춘다. 새 카드: registry 정의 → runner(`engine/more.ts`) → 필요하면 `backend/` 빌더.
- **이중 언어 UI**: 카드 라벨·설명은 영어로 쓰고, 한글은 `src/i18n.cards.ts` 사전에 키(영어 원문)로 추가한다. 키 중복 금지. 한글이 단어 중간에서 끊기면 안 된다(CSS `word-break: keep-all`; 하이픈은 비분리 하이픈 U+2011).
- 프롬프트 칸은 영어가 모델 입력, 한국어는 보기용(KO/EN 버튼, `translate.ts`/`bilingual.ts`). 노드 `bilingual.js` 와 같게 유지.
- 네이티브 `confirm/prompt/alert` 금지 → `src/ui/dialog.tsx` 의 `askConfirm/askText/notify`.
- 버전은 `vMAJOR.MINOR.PATCH`: 기능 추가=MINOR, 수정·작은 추가=PATCH. 올릴 곳: `package.json`, `package-lock.json`(2곳), `mcp/server.ts`(serverInfo version), `docs/HANDOFF.md` 제목.
- `CHANGELOG.md`: 맨 위에 `## X.Y.Z — YYYY-MM-DD`, 그 아래 `### 추가 / 변경 / 수정 / 확인`, 한국어, 사용자가 보는 동작 중심.
- 커밋 메시지: `Release X.Y.Z: 변경 요약(영어)`, 끝에 `Co-Authored-By: …` 줄. 릴리즈 = 커밋 → 태그 `vX.Y.Z` → `git push origin main vX.Y.Z` → `gh release create vX.Y.Z`. 그 전에 `npm run typecheck`, `npm run build:mcp`.
- 커밋·푸시·릴리즈·버전업은 **사용자가 시켰을 때만**(스튜디오 세션이 "사용자가 승인했습니다."를 전하면 그것도 승인으로 취급하는 것이 사용자 방침).

## 6. 절대 하지 말 것
- **노드 저장소(`ComfyUI-TJ_NODE*`)와 `nodes.py`, 서버 코드는 이 저장소 작업에서 수정 금지.** 그쪽 변경은 이식 명세(`SPEC_RELAY_*`)로만 받는다. 명세와 노드 코드가 다르면 먼저 물어본다.
- 사용자 파일 삭제는 사용자 동의 필요. `C:\AI\output` 의 갤러리 파일을 지우지 말 것(과거에 실수로 휴지통에 간 적 있어 복구함).
- **ComfyUI 재시작**: 기본은 `POST /api/manager/reboot`(성공 시 "Failed to fetch"), 사용자 OK + `GET /queue` 가 비었을 때만, 렌더 중 금지. 프로세스를 죽이는 건 8188 이 죽었다고 확인됐을 때만 바탕화면 `ComfyUI.lnk`(→ `C:\AI\ComfyUI-Easy-Install\ComfyUI.bat`)로.
- **생성 중에 로컬 LLM(GGUF/comfy/ollama/custom) 호출 금지** — ComfyUI 가 죽는다. OpenRouter 만 안전. 로컬 GGUF 호출이 5분을 넘으면 느린 게 아니라 터진 것으로 보고 `/interrupt` → 안 되면 재실행. 로컬 백엔드 시험을 OpenRouter 로 대체하지 말 것.
- H3 영상 시험에는 7+1 카드(0.7MP 시작, 1.6MP 마지막)를 붙인다(안 붙이면 매우 느림).
- VHS 저장 시 `extra_pnginfo.workflow.extra` 의 `VHS_KeepIntermediate:false`, `VHS_MetadataImage:false` 를 유지(무음 mp4·PNG 가 갤러리에 쌓임). `-audio.mp4` 규칙 유지.
- `hiresFinish` 메타는 후처리 결과에 설정 금지(재사용 시 7+1 이 켜짐).
- OpenRouter 는 기본 모델이 없다(`or_model_*` 기본값 빈 값, 비면 팝업). 기본 모델을 다시 넣지 말 것.
- API 키·토큰을 저장소·로그에 넣지 말 것(키는 서버에 저장). 저장소는 공개 상태다.
- **라이선스**: 이 저장소는 GPL-3.0-only(`LICENSE`, `NOTICE.md`). 노드(GPL-3.0)는 읽고 포팅해도 되나 고지 유지. freavy(MIT)는 개념만 참고, 코드 복사 금지. 라이선스를 바꾸지 말 것.
- **Director 화면 시험은 실제 LLM을 부르지 않는다**: 설정된 LLM은 공유 GPU의 로컬 GGUF일 수 있다. 시험은 `window.__directorLlm = window.__directorDemo`(DEV 훅)나 "LLM 없이 체험해 보기"(sessionStorage에 유지)로만, 시험 중 소스 수정 금지(hot reload가 플래그를 풀어 실제 LLM이 호출된 사고가 있었음). 시험 전후 `nvidia-smi`와 `GET /queue` 확인.
- Director 데이터는 `director/` 폴더(캔버스 목록과 분리)에만 둔다. 승인된 내용은 AI 재작성이 덮어쓰지 않는다. 실행은 사용자가 누르고 확인에 "예"한 것만(생성 자동 시작 금지).

## 7. 다른 저장소와의 연동 점검
- 노드 `nodes.py` 라우트(`/tj_studio_one/llm/*`, `/tj_shared/*`, `/minimax_h3_one/*` stitch·delete·clip_last_frame·config, `/tj_node/reflib/*`)에 의존한다. 라우트·필드가 바뀌면 `src/backend/*.ts` 와 `docs/ARCHITECTURE.md` 표를 맞춘다.
- 합치기(stitch)는 전부 노드 서버 `/minimax_h3_one/stitch` 를 거친다(이 저장소는 ffmpeg 를 직접 부르지 않음). iPhone 재생 규격(yuv420p, 일정 fps, H.264 high 5.1 이하, faststart)은 노드가 책임진다.
- 웹 쌍둥이 `AI-ONE-STUDIO` 와 기능이 같아야 하는 것(번역 KO/EN, H3 업스케일 분할, 연속성)은 같은 명세를 받아 각자 이식한다. 한쪽을 고치면 다른 쪽도 확인 필요.
- 터널: `canvers.tjtj.cloud` → 8765. 허용 호스트는 `vite.config.ts` / `CANVERS_ALLOWED_HOSTS`. ComfyUI 는 `--enable-cors-header` 로 켜져 있음(주소를 바꾸면 `COMFY_URL` 또는 설정에서 입력 → `/canvers/target`).

## 8. 현재 진행 상황 (2026-10-28 기준, v2.27.4)
- 최근 릴리즈: 2.23.x 프록시·갤러리·라이트박스 → 2.24 클립 이어서 생성 카드 → 2.25 노드 v1.47.0(Kimchy 업스케일, LTX 업스케일 분할)·새로고침 뒤 여러 클립 복구 → 2.26.0 H3 업스케일 분할 모드(노드 v1.48.0) → 2.27.x 번역(KO/EN, 번역 LLM, 노드 v1.49.0~1.49.2), OpenRouter 기본 모델 제거.
- 실기 미검증으로 남은 것: 새 Latent Upscale 그래프(H3/Kimchy/LTX) 전체, 분할 모드 실렌더·복구, H3 여러 클립 복구, 번역 켠 상태의 OpenRouter/GGUF/Custom 백엔드, 설정 "번역 LLM" 화면, Face Refine 다인 체인, Anima inpaint.
- 이식하지 않기로 한 것(관제 합의): frames→vision 프롬프트 대체, H3→LTX 프롬프트 재작성, Merge clips/Write 메뉴/Long Shot(대응 카드 없음), hires 테두리, 툴팁 텍스트 필드.
- 알려진 제한: 소리 없는 mp4 는 VHS 로더가 실패, 소스 프레임 수를 길이×24 로 추정(±1프레임).
- 다음 할 일은 스튜디오 세션(`TJ_STUDIO_ONE-10월`)이 `SPEC_RELAY_*` 로 보낸다. 상세 이력은 `CHANGELOG.md`, 방향·메모는 `docs/HANDOFF.md`.

### 뮤직비디오 음악 단계 (2026-10-29, 앱 화면까지 코드 완료, 데모 브라우저 확인은 일부만)
- 사용자 결정: 뮤직비디오 음악은 **업로드·AI 생성 둘 다**, 화면에서 고르거나 채팅 명령으로 선택.
- 로직(커밋 276511d, `npm run test:director` 7개 스크립트): 스키마 v5(`DirectorProject.music`, `StageId 'music'`, `CanvasLink.purpose 'music'`, `final_node_id`, `music_nodes`), `src/director/music.ts`, workflow 음악 단계(`hasMusicStep`/`nextGlobal`), ai.ts 음악 프롬프트/검증/적용, adapter `buildMusicCanvas`·`finish` 옵션(스티치 + 노래 얹기), execution `applyMusicResult`/`applyEpisodeFinal`.
- 앱 쪽(이번 작업): `src/director/musicAction.ts`(`uploadSong` 업로드, `generateSong` Music Generate 카드로 생성 — 확인창 뒤에만, `pickSong`, `finishEpisode` 클립 합치기+노래 얹기, `syncFinalFromCanvas`), `canvasAction.ts`(뮤직비디오 에피소드 캔버스에 `finish` 전달, 일부 헬퍼 export), store(`writeSong()` = 작업팀이 노래 스타일·가사·구조를 씀/업로드곡 구조 제안, 채팅 `music.generate` 명령 → 생성, 재시도·`takeOver`에 music), DirectorView(`MusicCard`: 내 노래/AI로 만들기 선택·업로드·스타일·가사·엔진·테이크 재생·구간 막대·클립 대응 막대, `FinalBlock`: 생성/검토 단계의 완성 영상, 뮤직비디오만 단계 줄에 "노래"), demoCrew 음악 분기, demoMedia(`demoWavUrl`/`demoSongResult`/`demoFinalResult`), i18n.director.ts, styles.css.
- 데모로 확인한 것(2026-10-29, 사용자 지시로 이후 검증은 한꺼번에 나중에): 노래 쓰기(스타일·가사·구간 9개·클립 막대 18개)·노래 만들기(테이크 1개·재생기)·승인 → 시나리오 이어짐까지. 앞선 확인: 뮤직비디오 문장 → 브리프 → 캐스팅 → **노래 단계 화면(두 선택 카드, 단계 줄)**, "AI로 만들기" 선택. **확인 못 한 것**: 작업팀 노래 쓰기 → 노래 만들기 → 승인 → 시나리오 이어짐, 업로드, 완성 영상 합치기(데모는 카드 이미지), 채팅 `music.generate`, 실제 LLM·GPU·ComfyUI(업로드·Music Generate·Video Stitch·Add Audio), 노래 에셋 등록(코드 완료: `registerSong`, 노래 승인 때 자동 등록 + 화면 버튼, 데모는 프로젝트 에셋만 — 실기 미확인).
- 알게 된 시험 함정: HMR 뒤 콘솔에서 모듈을 import 하면 `?t=` 인스턴스가 달라 "no project" 가 난다 → 화면 버튼을 눌러 확인하거나 페이지를 새로고침 후 한 번에 import.
- 코드만 끝낸 것(2026-10-29, 검증은 나중에 한꺼번에): 생성 중 클립별 진행 막대(`ClipCard`의 `live` = 열려 있는 캔버스의 생성 카드 runtime, 실제 생성 때만 보임), 브이로그 클립의 `dialogue`를 "내레이션"으로 표시(전용 필드는 만들지 않음 — 스키마 변경 없이 라벨만).
- 코드만 끝낸 것(검증 대기): **광고 등 다른 화면비 버전** — `series.versions`(추가 화면비 목록, 스키마 변경 없음), `CanvasLink.aspect`(추가 화면비 캔버스, 주 캔버스는 없음), `canvasAction.makeVersionCanvases/extraAspects/versionLinks`, 캔버스 단계의 `VersionsBlock`(체크 + "다른 화면비 캔버스 만들기" + 열기). 같은 프롬프트·캐스트·시드, 화면비만 다름. 생성은 캔버스에서 손으로(결과는 그 캔버스에 남음, 샷 결과로 안 들어옴). `linkOfEpisode`·`planBatch`·`episodeBlockers`는 `!l.aspect` 로 주 캔버스만 본다.
- 코드만 끝낸 것(검증 대기): **새 모습(의상 변형)** — 캐스팅 카드의 "+ 새 모습"(인물·장소, 이미 변형인 것 제외) → 설명 입력 → `variant_of` 가 붙은 새 항목(프롬프트 = 기본 프롬프트 + 설명). **한계**: 기본 이미지를 입력으로 넣는 이미지 편집(같은 얼굴 유지)은 아직 아님 — 글 프롬프트만으로 새로 생성. 다음 개선 후보: 기본 이미지를 `image-edit` 카드(Qwen Edit/Klein edit)에 연결해 변형 생성.
- **한꺼번에 하는 검증 목록은 `docs/DIRECTOR_VERIFY_CHECKLIST.md`**. 좁은 창 CSS 는 이미 있음(눈으로 확인만).
- 그 뒤 후보: 변형을 이미지 편집으로(얼굴 유지), 좁은 창 편 스트립 확인, 그리고 **한꺼번에 하는 검증**(위 "확인 못 한 것" 목록 + 진행 막대).

### Director Mode 진행 (미릴리즈, 2026-10-29, 커밋됨 — 버전 올림·릴리즈 전)
- 된 것(코드 + 시험): 채팅 중심 화면, 브리프→캐스팅→시나리오→편별(작성·캔버스·생성·검토) 진행선, **편마다 자기 단계**(여러 편 동시 진행·한 편만 되돌리기), 회차 선택 줄·여러 편 체크, 위쪽 단계 클릭으로 다시 보기(보기는 상태를 바꾸지 않음), 캐스트 이미지 선택(생성/에셋 라이브러리/갤러리)과 끝까지 따라오기(캔버스에 `@imageN` 순서로 Load Image 연결, 엔진 h3-ref), 자동/수동 생성 선택(수동 = 캔버스 열기·ZIP), 클립별 시드·다시 생성·선택 클립 배치·여러 편 배치(한 번 확인), 이어서 만들기, 편 ZIP, 디렉터 전용 LLM 설정.
- **브라우저로 직접 확인한 것(데모 작업팀)**: 브리프~생성 선택, 라이브러리 이미지로 캐스팅, 캔버스 연결(카드·선·엔진·프롬프트 순서), ZIP 다운로드, 자동 시작 확인창 취소, **편 3개 동시 작성·일괄 승인·캔버스 3개 생성·생성 단계 동시 진행, 회차 줄 이동, 위 단계 눌러 다시 보기(상태 불변), 생성 범위(이 편/체크한 편/이 단계 모든 편 = 27클립 확인창, 취소 시 변화 없음), 클립 체크·시드·선택 클립 확인창, 한 편만 되돌리기(클립·캔버스 유지), 모델 설정 창(4가지 백엔드)**. **아직 못 본 것**: 배치 진행 표시(실제 생성 중 모습)·좁은 창에서 회차 줄.
- **실제로 안 돌린 것**: 실제 LLM 전체 흐름, 실제 렌더(`@imageN` 대응), 캐스팅 이미지 실생성, 에셋 등록(갤러리 선택분), 음악 생성.
- **결과 우클릭 → 에셋 등록**(Director와 별개 기능, 완료): `src/ui/RegisterAsset.tsx`(`AssetView`의 이미지·영상·음악에 `onContextMenu`; 캔버스 카드·심플·뷰어 공통). 우클릭 메뉴 "에셋으로 등록…" → 화면 중앙 팝업(에셋 이름 `@태그`, 카테고리 = 서버 라이브러리 목록, 이름 미리보기·사용 불가 문자는 `_`로 치환). 서버(`/tj_node/reflib/assets`)는 같은 이미지(해시)를 한 번만 두고 기존 에셋을 돌려주므로, 이름이 다르면 "같은 이미지가 이미 @이름으로 등록되어 있습니다"라고 알림. 브라우저 확인: 우클릭 메뉴(캔버스 자체 메뉴와 겹치지 않음)·중앙 팝업·카테고리·API 등록(시험 에셋은 삭제해 라이브러리 6개 그대로). **미확인**: 영상·음악 결과에서의 우클릭(코드는 같은 경로), 팝업으로 새 이미지 신규 등록(API 직접 호출로는 확인).
- **캐스팅 생성 모델 선택·일괄/개별 생성·등록(완료)**: `image-generate` 카드의 엔진(Krea 2, Qwen Image 2.1, Z-Image Turbo, Flux.2 Klein, Qwen Edit, Anima, SDXL, Moss…)을 프로젝트 설정 `settings.cast_engine`으로 고름. 어댑터(`buildCastingCanvas`)가 엔진별 기본값(`RegDef.perEngine`)으로 카드를 만들고, 모델을 바꾸면 아직 어댑터가 준 모델 그대로인 카드만 따라가며(`link.engine_sent`) 캔버스에서 직접 고른 모델은 유지. 항목별 시드(`ref.seed`, `link.seed_sent`)로 "다시 생성"=다른 결과, 새 이미지가 선택되고 이전 것은 후보로 남음. 전체 일괄 생성(이미지 없는 항목) / 항목별 생성은 모두 확인창(모델 이름·대상 목록) 뒤에만 실행. 에셋 등록: 설정 `cast_register` 자동(캐스팅 승인 때 전부) / 수동(카드의 "에셋으로 등록"·"지금 전체 등록"만), 라이브러리에서 고른 것은 이미 에셋. 브라우저 확인: 모델 선택·캔버스 엔진 전환·확인창·취소 시 큐 0/0. **미확인**: 실제 캐스팅 이미지 생성(모델별 파라미터 호환), 후보 이미지 줄(2장 이상일 때).
- **브리프 설정 드롭다운 + 캐스팅 프롬프트 + 전 단계 데모(완료)**: 브리프의 6개 항목(편수·편당 길이·편당 클립·화면 비율/해상도·생성 방식, 전체 분량은 계산)을 결과 화면에서 드롭다운으로 바꾸고 "적용"(되돌리기 = "실행 취소")으로 저장(`BriefTiles`, 저장 시 `ai.ts`의 `applySeriesPatch` = 작업팀 JSON과 같은 검사). 이미 쓴 시나리오·클립은 안 바뀐다는 안내 표시. 캐스팅 카드의 "프롬프트"(한국어/English 전환, 수정 + 적용, `ref.prompt_ko` 신규; 영어가 모델 입력). **데모 모드**(`store.demo`, 첫 화면 체크박스 또는 ⚙ 창의 스위치, 제목줄 DEMO 배지): LLM(`demoCrew`)·GPU·캔버스 파일·에셋 라이브러리 없이 전 단계(캐스팅 이미지 생성/등록, 편 작성, 가상 캔버스 `(demo) …`, 일괄·선택 클립·다시 생성, 검토, 완료)를 진행. 결과는 `demoMedia.ts`의 라벨 붙은 SVG 대체 이미지(`source:'demo'`, `data_url`, 클립 결과도 이미지). 데모 캔버스와 실제 캔버스는 섞이지 않음(데모를 끄면 링크를 새로 만듦). 브라우저 확인: 브리프 드롭다운→적용/취소, 프롬프트 한/영·수정, 캐스팅 5장 생성·5개 등록, 시나리오, 편 2개 동시 작성·승인, 가상 캔버스(실제 파일 0개), 생성 12클립 배치 진행 표시, 한 클립 다시 생성(시드 변경·후보 추가), 체크한 클립 생성, 검토, 완료.
- UI 조정 기록: 회차 줄 칩 폭 68px(사용자 요청으로 34px의 2배, 30편은 가로 스크롤).
- **작품 종류(완료)**: `series.format` = drama / film / ad / musicvideo / vlog / short (스키마 4, 3→4 마이그레이션 = drama). `src/director/formats.ts`(순수): 종류별 화면 용어 `vocabOf`(캐스팅 = 배우·장소·소품 / 모델·제품 / 아티스트·의상 / 진행자…, 시나리오 = 스토리보드·구성안…), 기본 숫자(광고 30초·6초 클립, 뮤직비디오 3분, 숏폼 9:16 30초…), 작업팀 지침 `guide`, 말로 종류 읽기 `detectFormat`. 작업팀은 브리프에서 종류를 정하고(빠뜨리면 사용자의 말에서 읽음) 그 종류의 지침을 시스템 프롬프트에 받음. 1편짜리 종류는 회차 줄을 숨기고 시나리오 승인 뒤 작성이 자동 시작. 브리프 맨 위에 "작품 종류" 드롭다운. 데모 작업팀도 종류별 캐스팅·클립(광고 엔드카드, 뮤직비디오 구간, 브이로그 내레이션 대사, 숏폼 훅). 브라우저 확인: 광고 한 문장 → 광고로 인식·30초·6초 클립 5개·용어 변경·회차 줄 숨김·자동 작성·엔드카드. **미구현**: 광고 비율별(16:9·9:16·1:1) 버전 생성, 뮤직비디오 음악 단계(사용자 업로드 + AI 생성 병행, 화면 선택 또는 채팅 명령), 브이로그 전용 내레이션 필드(현재는 클립의 `dialogue`가 내레이션 역할).
- 다음 할 일: ① (완료) 편별 UI ② (완료) 결과 우클릭 에셋 등록 ③ (완료) 캐스팅 모델·일괄/개별·등록 ④ (완료) 브리프 설정 드롭다운·캐스팅 프롬프트·전 단계 데모 ⑤ 사용자가 데모로 단계별 확인하며 주는 수정 피드백 반영 ⑥ 음악 생성·에셋화 ⑦ 실제 LLM·GPU 시험(사용자가 서버가 비었다고 할 때만) ⑧ 좁은 창 회차 줄 확인.

## 9. 작업을 끝낼 때
1. `npm run typecheck`(필요하면 `npm run build`) 통과 확인, 시험용 서버(8766)·임시 파일 정리.
2. `CHANGELOG.md` 맨 위에 새 항목 추가. 구조·방침이 바뀌면 `docs/HANDOFF.md`(제목 버전 포함)와 `docs/ARCHITECTURE.md` 도 갱신.
3. 릴리즈할 때만: 버전 4곳 갱신 → `npm run build:mcp` → 커밋 → 태그 → 푸시 → `gh release create`.
4. 보고는 항목별로 "이식함 / 해당 없음(이유) / 검증 못함", 바꾼 파일, 확인할 점을 적는다.
5. 사용자에게는 새 버전을 쓰려면 서버를 끄고 `start.bat` 으로 다시 시작해야 한다고 알린다.

## 10. Claude Code 전용 기능에 기대는 부분 (다른 모델은 일반 텍스트 규칙으로 대신)
- `.claude/launch.json`(미리보기 서버 정의, 포트 8765 — 운영 서버와 겹치니 직접 쓰지 말고 §4 의 8766 방식) 외에 이 저장소에 skills·훅은 없다(확인함).
- 세션 간 메시지(`SendMessage`, 스튜디오 세션 연락)와 자동 메모리는 Claude Code 기능이다. 다른 모델은 사용자에게 직접 확인받고, 위 §6 규칙을 그대로 지킨다.
