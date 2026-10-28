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
1. `HANDOFF.md` — 방향, 완료 기능, 개발 메모, 라이선스 결정. (일부 낡음, 아래 §8)
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
- `graphify-out/` — 로컬 도구 데이터. 추적 안 함, 건드리지 말 것.

## 4. 실행 · 빌드 · 테스트 (package.json 확인됨)
- 설치+운영: `start.bat`(Windows) / `./start.sh` → `git pull --ff-only` → `npm install` → `npm run build` → `node serve.mjs` (포트 **8765**).
- 개발: `npm run dev`(vite). **사용자가 운영 서버(8765)를 쓰고 있으니 테스트는 다른 포트로:** `node node_modules/vite/bin/vite.js --port 8766 --strictPort`, 끝나면 반드시 종료.
- 타입 검사: `npm run typecheck` (= `tsc --noEmit`). 빌드: `npm run build`. MCP 빌드: `npm run build:mcp`.
- `npm run mock`(MOCK 포트로 가짜 ComfyUI, GPU 없이 UI 시험). 자동 테스트 스위트는 없음(확인 필요: HANDOFF 의 "mock e2e" 스크립트 위치).
- 실제 시험은 `127.0.0.1:8188` 의 진짜 ComfyUI 로 한다(HANDOFF 방침). GPU 는 16GB 공유.

## 5. 코딩 · 문서 규칙 (이미 지키는 것)
- 주석·문구 밀도와 이름은 주변 코드에 맞춘다. 새 카드: registry 정의 → runner(`engine/more.ts`) → 필요하면 `backend/` 빌더.
- **이중 언어 UI**: 카드 라벨·설명은 영어로 쓰고, 한글은 `src/i18n.cards.ts` 사전에 키(영어 원문)로 추가한다. 키 중복 금지. 한글이 단어 중간에서 끊기면 안 된다(CSS `word-break: keep-all`; 하이픈은 비분리 하이픈 U+2011).
- 프롬프트 칸은 영어가 모델 입력, 한국어는 보기용(KO/EN 버튼, `translate.ts`/`bilingual.ts`). 노드 `bilingual.js` 와 같게 유지.
- 네이티브 `confirm/prompt/alert` 금지 → `src/ui/dialog.tsx` 의 `askConfirm/askText/notify`.
- 버전은 `vMAJOR.MINOR.PATCH`: 기능 추가=MINOR, 수정·작은 추가=PATCH. 올릴 곳: `package.json`, `package-lock.json`(2곳), `mcp/server.ts`(serverInfo version), `HANDOFF.md` 제목.
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
- 다음 할 일은 스튜디오 세션(`TJ_STUDIO_ONE-10월`)이 `SPEC_RELAY_*` 로 보낸다. 상세 이력은 `CHANGELOG.md`, 방향·메모는 `HANDOFF.md`.

## 9. 작업을 끝낼 때
1. `npm run typecheck`(필요하면 `npm run build`) 통과 확인, 시험용 서버(8766)·임시 파일 정리.
2. `CHANGELOG.md` 맨 위에 새 항목 추가. 구조·방침이 바뀌면 `HANDOFF.md`(제목 버전 포함)와 `docs/ARCHITECTURE.md` 도 갱신.
3. 릴리즈할 때만: 버전 4곳 갱신 → `npm run build:mcp` → 커밋 → 태그 → 푸시 → `gh release create`.
4. 보고는 항목별로 "이식함 / 해당 없음(이유) / 검증 못함", 바꾼 파일, 확인할 점을 적는다.
5. 사용자에게는 새 버전을 쓰려면 서버를 끄고 `start.bat` 으로 다시 시작해야 한다고 알린다.

## 10. Claude Code 전용 기능에 기대는 부분 (다른 모델은 일반 텍스트 규칙으로 대신)
- `.claude/launch.json`(미리보기 서버 정의, 포트 8765 — 운영 서버와 겹치니 직접 쓰지 말고 §4 의 8766 방식) 외에 이 저장소에 skills·훅은 없다(확인함).
- 세션 간 메시지(`SendMessage`, 스튜디오 세션 연락)와 자동 메모리는 Claude Code 기능이다. 다른 모델은 사용자에게 직접 확인받고, 위 §6 규칙을 그대로 지킨다.
