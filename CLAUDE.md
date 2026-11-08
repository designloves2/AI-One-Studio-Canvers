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

## 8. 현재 진행 상황 (2026-11-03 기준, v2.31.1 — Director Mode, Split Sigma, Tiled 업스케일러, LLM 실시간 로그 포함)
- 최근 릴리즈: 2.23.x 프록시·갤러리·라이트박스 → 2.24 클립 이어서 생성 카드 → 2.25 노드 v1.47.0(Kimchy 업스케일, LTX 업스케일 분할)·새로고침 뒤 여러 클립 복구 → 2.26.0 H3 업스케일 분할 모드(노드 v1.48.0) → 2.27.x 번역(KO/EN, 번역 LLM, 노드 v1.49.0~1.49.2), OpenRouter 기본 모델 제거.
- 실기 미검증으로 남은 것: 새 Latent Upscale 그래프(H3/Kimchy/LTX) 전체, 분할 모드 실렌더·복구, H3 여러 클립 복구, 번역 켠 상태의 OpenRouter/GGUF/Custom 백엔드, 설정 "번역 LLM" 화면, Face Refine 다인 체인, Anima inpaint.
- 이식하지 않기로 한 것(관제 합의): frames→vision 프롬프트 대체, H3→LTX 프롬프트 재작성, Merge clips/Write 메뉴/Long Shot(대응 카드 없음), hires 테두리, 툴팁 텍스트 필드.
- 알려진 제한: 소리 없는 mp4 는 VHS 로더가 실패, 소스 프레임 수를 길이×24 로 추정(±1프레임).
- 다음 할 일은 스튜디오 세션(`TJ_STUDIO_ONE-10월`)이 `SPEC_RELAY_*` 로 보낸다. 상세 이력은 `CHANGELOG.md`, 방향·메모는 `docs/HANDOFF.md`.

### Director ↔ 캔버스 짝 묶기 (2026-11-03, 코드 완료 · 미릴리즈 · 화면 검증 전)
- 규칙: **Director 프로젝트가 주인, 캔버스는 짝**. `Project.director`(`DirectorPair`: file·project_id·name·episode_id·no·purpose)를 캔버스 파일에 기록. 코드: `src/director/pairing.ts`(`stampPair` 저장 때 기록, `backfillPairs` 옛 캔버스에 짝 추가, `openCanvasOfProject` Director 열면 캔버스 열기, `openDirectorOfCanvas` 캔버스에서 Director 열기, `prepareCanvasForNewDirector` 짝 없는 캔버스 + 새 프로젝트면 경고→저장→빈 캔버스, `adoptIntoEmptyCanvas` 빈 자리에 편 캔버스 열기), `PairBar.tsx`(캔버스 위 띠), `store/graph.ts`(`directorPair`, toProject/loadProject에 포함), `server-lib/canvases.mjs` 목록에 `director` 요약, `CanvasesPanel` 🎬 표시. 훅: `canvasAction`·`musicAction` 저장 4곳(`stampPair`), `DirectorPanel.open`, `store/director.send`(첫 문장).
- **프롬프트 동기화 = 버튼으로 저장**("바깥 클릭 저장"은 위험해서 쓰지 않음): 5단계·6단계 격자(`ShotPrompt` = `shot.prompt_user`)는 고치기 시작하면 "저장 안 됨" + [저장][취소], [저장] 때만 `prompt_user` 반영. Director→카드는 `pairing.startPairSync` 가 `prompt_user` 변화를 보고 즉시 `setParam`(저장·작업팀 생성 모두), 카드→Director 는 카드 아래 `PairApply`("디렉터와 다름 · 디렉터에 적용", `promptCardState`/`applyCardToDirector`)를 누를 때만. `link.prompt_sent` 도 같이 갱신해 "캔버스가 오래됨"이 안 뜸. 데모·읽기 전용·짝 아닌 캔버스는 동작 안 함. 주의: Director 저장이 카드의 아직 적용 안 한 손글을 덮어씀. 화면 검증 전.
- **프로젝트가 최상위**(2026-11-08, 코드 완료·화면 일부 확인): `projects/<이름>.json` 매니페스트 `{director: 파일|null, canvases[], canvas, simple[](심플 작업 목록), mode}`. 서버 `server-lib/projects.mjs`(`/canvers/projects`, 처음 한 번 예전 director/·canvases/ 를 프로젝트로 자동 묶음, `.migrated` 표시), 클라 `backend/projects.ts`, 상태·동작 `store/workspace.ts`(`startWorkspaceSync` 가 director 파일·캔버스 저장·모드·심플 작업을 매니페스트에 반영, `openProject/newProjectFlow/saveAll/duplicateProject/exportProject/importProject/sendPart/clearPart/deleteProject`, 묶음 `collect`/`install` 이 짝 연결을 새 이름으로 다시 이음), 화면 `panels/ProjectsPanel.tsx`(옛 `DirectorPanel`/`CanvasesPanel` 은 삭제). 상단 탭 도트(`.tab-dot.on` = 내용 있음), 열린 프로젝트 이름 버튼, 저장 상태·⤓·Ctrl+S 는 전체 저장(`saveAll`, 안 바뀐 디렉터는 다시 쓰지 않음). 삭제 = 매니페스트 + 디렉터 파일(.backup 에 남음) + 캔버스 파일. 짝 구조(`PairBar`, 동기화, 짝 없음 경고)는 그대로.
- **LLM 슬롯 따라가기**: `settings.ts` 의 `LlmKind`(main/vision/live/director), 슬롯마다 `same`+`follow`. 실제 설정은 `resolveLlmKind`/`effectiveLlm`/`llmOfKind`(순환이면 main), 선택 목록 순환 방지는 `followsKind`. `llm.ts` 의 `llmFor`(이미지 요청 = vision)·`directorLlmSettings`·`liveLlmSettings` 가 이를 씀. 서버에 저장되는 건 vision 의 `same` 뿐(`follow` 는 브라우저).
- **번역 슬롯**: 이제 다른 LLM 슬롯과 같은 구조(`settings.translate {same, follow, llm, seeded}`, `LlmKind` 에 'translate'). `translateLlm()` 은 `seedTranslate()`(처음 한 번 서버 `/tj_shared/translate_config` 를 `fromTranslateConfig` 로 가져옴) 뒤 `runLlm`(온도 0.2). 저장 때 `toTranslateConfig` 로 서버 노드 공용 설정에도 반영. 서버 `translate_llm` 라우트는 더 부르지 않음.
- **설정 화면 아코디언**(`SettingsPanel`, 한 번에 하나만 열림): 연결·언어 / LLM(브리프·이미지설명·라이브·디렉터·번역) / 모델(이미지·영상·음악), 마지막 열린 메뉴는 localStorage `canvers.settings.open`. **심플 모드 첫 문장 라우팅**(`simple/route.ts` `routeFirstMessage`, 낱말 판정·LLM 없음): 캔버스 요청 → 캔버스 모드 + 라이브 패널(`setPendingLive` → `LivePanel` 이 열리며 전송), 작품 제작(`detectFormat` 등) → 디렉터 모드 + `useDirector.send`. 화면 검증 전.
- **생성·확인 정지**: `canvasAction.stopDirectorGeneration`(= `stopAll()` + 다음 클립/편 시작 막는 `stopRequested`; `generateBatch` 시작 때 초기화). 클립 카드의 재생성 버튼은 `status` 가 generating/queued 이면 "■ 중지"로 바뀌고, 위에 "■ 생성 정지" 줄도 있음. 화면 검증 전(큐가 도는 중이라 시험하지 않음).
- **생성 전 번역 검사**(`translate.ensureGraphEnglish`): `<d>..</d>` 대사 안의 한글은 번역 필요 판정에서 뺀다(Director 프롬프트는 영어 글 + 한국어 대사라 전부 번역되던 문제). 노드 `bilingual.js` 의 `fieldNeedsEnglish` 자체는 그대로.
- **짝 캔버스 없음 처리**: `useCanvasMissing(p,no)`(캔버스 목록에 그 편 캔버스 파일이 없으면 true; 데모·목록 읽기 실패는 false) → 5단계 `CanvasCard` 버튼과 6단계 `PromptGrid` 의 적용 버튼이 `.btn.miss`(빨강) + "생성용 캔버스 생성". 만들기·삭제 후 `canvasListChanged()` 이벤트로 갱신. 프로젝트를 열 때 `pairing.openCanvasOfProject` 가 `episodesWithoutCanvas`(단계 execute 이상·done 제외)를 찾아 팝업 → 예 = `makeEpisodeCanvas`. 화면 검증 전.
- 한계: 편(focus)을 바꿀 때마다 캔버스가 따라 바뀌지는 않음(프로젝트를 열 때만). 짝 없는 캔버스와 새 프로젝트의 경고는 첫 문장을 보낼 때(프로젝트가 만들어지는 순간).
- 막장드라마 프로젝트: 클립 9 글은 `director/…json` 의 `prompt_user` 에 수정본이 있고, 캔버스 `- ep01` 카드는 "생성용 캔버스 확인"을 눌러야 반영된다.

### ★ 통합 정리 (2026-11-03) — 아래 여러 절을 합친 "지금 기준" (충돌하면 이 줄이 이김)
- 흐름: 브리프 → 캐스팅(카드 확인 → **이미지 프롬프트 만들기·확인 → 이미지 생성**, `prompt_ok`; 아래 7건 절의 "설명 하나 + auto_enhance" 는 이것으로 대체) → 시나리오 → 편별 [편 작성(한 편씩 순차, **직접 수정 `ClipEditor`**) → **프롬포트 생성 및 확인**(공식 H3 브리프 클립별 순차 생성, `prompt_user`) → 생성·확인(클립별 합격·제외, 합치기) → 최종 검토(시사회 화면)].
- 합쳐진 규칙: 클립을 고치면(직접 또는 채팅) 합격과 `prompt_user`(옛 글로 만든 브리프)가 지워지고 프롬포트 단계에서 다시 만들어진다. "여러 편 함께"는 없다. 5단계 이름은 '프롬포트 생성 및 확인'.
- 반자동 전환 · LLM 호출 기록 · 생각(`</think>`) 처리 · 부분 요청(planParts) · 라이브 로그 예약은 아래 각 절 그대로 유효.
- 검증은 아직 전부 "코드 + 시험 + 데모 일부". 실제 LLM/GPU 확인은 사용자가 진행 중.

### ★ 최신 진행 요약 — Director 캐스팅→시나리오→편별 UI 개편 + H3 공식 프롬포트 (2026-11-01, 푸시 완료)
**현재 편별 흐름(사용자 관점)**: `편작성(한 편씩, 이전 편이 끝나야 다음; 4단계에는 [클립 설명/샷 설명/대사/음향/음악] 입력 카드만 — 공식 H3 박스 없음)` → 승인 → **`프롬포트 생성 및 확인`**(5단계, 이전 명칭 캔버스): 클립마다 **공식 Minimax H3 (Video) 시스템 프롬포트**로 공식 6섹션 브리프(subject_definitions/summary/retention_analysis/detailed_description+[Shot 1]+<Subject N> (S1) says, <d>/overall_soundscape/non_diegetic_music)를 **한 개씩 순차 생성**(카드 "생성중…"→빈 칸부터 채워짐)하고 그리드에서 수정 → **"생성용 캔버스 확인"**(이전 명칭 캔버스에서 열기)이 수정분을 캔버스 프롬포트 카드에 반영. 대사는 공식 프롬포트 룰3(`<d>[Language]…</d>` 번역 금지)대로 원문 보존. "여러 편 함께" 제거됨.
**이 세션 구현(전부 단위 시험 `npm run test:director` + `npm run typecheck` 통과)**:
- 캐스팅: 카드 개별 삭제, **다시 캐스팅(전체/배우/장소/소품)** — `store.recast`+`ai.recastInstruction`+`model.dropReferences`, 채팅창 폭 드래그(`--dock-w`, localStorage), 오른쪽 결과 90% 폭, 카드 그리드 최대(캐스팅 5/시나리오 4/편작성 4/프롬포트 4/생성·확인 4).
- 프롬포트 그리드(캔버스·생성·확인 단계): `compose.clipPromptOf`(원문 조합, S1/S2 페르소나 + `(S1) <d>` 대사) + `prompt_user`(사용자 수정/공식 브리프 저장) + `model.shotSubjects` + "적용"/"생성용 캔버스 확인". `compose.ts`는 **공식 강화 입력용 원문 정보**(클립 설명+샷 설명/References/Dialogue/Sound/Music, 시스템 언어) — 공식 6섹션 브리프는 LLM이 표시용으로 생성.
- **편작성 클립 카드(시스템 언어 = 설정 UI 언어)**: 공식 H3(Ref2VA) 표시 박스 제거. 필드 = **클립 설명**(prompt_ko) · **샷 설명**(prompt_en, 카메라 무빙+1~3샷) · 대사 · 음향 · 음악. 클립/샷 설명·음향·음악은 **설정의 UI 언어**(`useLang`/`canvers.lang` — 영어 UI면 영어, 한국어 UI면 한국어; `ai.uiLang()`)로 작성(영어 번역 안 함). 대사는 사용자가 요청한 언어(번역 금지). 승인→프롬포트 생성 시 카드의 최종 수정 내용을 시스템 언어로 그대로 LLM 입력, 공식 H3가 영어 6섹션 브리프 생성.
- LLM 오류 완화: 묶음 일부 보존(`planParts` 재계산·`unitProgress` 동적 루프·그룹 1~N 허용), 오류 시 **모델 원문 보기/다운로드**(`ChatMsg.raw`, `CrewError`), 시나리오 "빠진 편 추가".
- **공식 H3 프롬포트 생성**: `canvasAction.generateClipPrompts`(클립당 `runLlm({style: formatFor('video-generate', h3-ref)})` → `shot.prompt_user`, `prompt_busy` 생성중). runJob('canvas')는 **캔버스 먼저 생성+5단계 노출 후 순차 생성**. 데모는 `demoOfficialBrief`(공식 형태 스텐드인, sleep 간격).
- 순차 편작성: `workflow.startEpisodes`(이전 편 done만), `episode.handoff`(최종 검토 승인 시 `episodeHandoff` 저장 → 다음 편 지시문에 포함), "여러 편 함께" UI/스토어 제거.
- 라벨: 5단계 `캔버스`→`프롬포트 생성 및 확인`, 열기 버튼 `생성용 캔버스 확인`.
**진행 중 프로젝트 보존**: `director/막장드라마로 배신, 욕망, 비밀, 반전이 있….json`(10부작, 1편 작성 후 승인 대기) — **삭제 금지**, 사용자 `start.bat` 재시작 후 편작성 승인부터 이어서 진행하면 새 로직이 적용된다.
**커밋(이 세션, 전부 origin/main)**: `6cf20b6`(캐스팅 관리·화면 폭) `221f391`(프롬포트 그리드) `22bfd22`(LLM 부분 보존·원문 다운로드·순차 편작성·대사 `<d>`) `1af1d69`(Ref2VA S1/S2 + "여러 편 함께" 제거) `7b0b703`(공식 3섹션 초안) `eef1564`(공식 Minimax H3 (Video) 시스템 프롬포트로 클립별 브리프 생성 + Ref2vaBox) `9b54341`(한 개씩 순차 생성·빈 칸 시작·생성용 캔버스 확인 동작) `2e5b653`(라벨: 프롬포트 생성 및 확인/생성용 캔버스 확인) `2f7e710`(시스템 언어 기반 클립 카드·4단계 공식 H3 박스 제거) `7205601`(클립/샷 설명·음향·음악을 설정 UI 언어로 작성) `eda5569`/`fdf0fe0`/`11cacbe`(문서·정리). 참고: `7b0b703`의 3섹션(integrated_multimodal_description)은 사용자가 공식 6섹션 구조를 제시해 `eef1564`에서 6섹션 방식으로 대체됨.
**남은 것(실기 검증 필요, 데모로는 안 됨)**: 실제 LLM(사용자 서버 설정)로 클립별 공식 브리프가 한 개씩 생성·표시되는지, 공식 브리프가 실제 ref2va 렌더에서 인물·대사로 파싱되는지, LLM 실패 시 원문 보존 동작. 데모(포트 8766)는 공식 브리프 대신 형태를 흉내 낸 스텐드인을 씀.

### 뮤직비디오 음악 단계 (2026-10-29, 앱 화면까지 코드 완료, 데모 브라우저 확인은 일부만)
- 사용자 결정: 뮤직비디오 음악은 **업로드·AI 생성 둘 다**, 화면에서 고르거나 채팅 명령으로 선택.
- 로직(커밋 276511d, `npm run test:director` 7개 스크립트): 스키마 v5(`DirectorProject.music`, `StageId 'music'`, `CanvasLink.purpose 'music'`, `final_node_id`, `music_nodes`), `src/director/music.ts`, workflow 음악 단계(`hasMusicStep`/`nextGlobal`), ai.ts 음악 프롬프트/검증/적용, adapter `buildMusicCanvas`·`finish` 옵션(스티치 + 노래 얹기), execution `applyMusicResult`/`applyEpisodeFinal`.
- 앱 쪽(이번 작업): `src/director/musicAction.ts`(`uploadSong` 업로드, `generateSong` Music Generate 카드로 생성 — 확인창 뒤에만, `pickSong`, `finishEpisode` 클립 합치기+노래 얹기, `syncFinalFromCanvas`), `canvasAction.ts`(뮤직비디오 에피소드 캔버스에 `finish` 전달, 일부 헬퍼 export), store(`writeSong()` = 작업팀이 노래 스타일·가사·구조를 씀/업로드곡 구조 제안, 채팅 `music.generate` 명령 → 생성, 재시도·`takeOver`에 music), DirectorView(`MusicCard`: 내 노래/AI로 만들기 선택·업로드·스타일·가사·엔진·테이크 재생·구간 막대·클립 대응 막대, `FinalBlock`: 생성/검토 단계의 완성 영상, 뮤직비디오만 단계 줄에 "노래"), demoCrew 음악 분기, demoMedia(`demoWavUrl`/`demoSongResult`/`demoFinalResult`), i18n.director.ts, styles.css.
- 데모로 확인한 것(2026-10-29, 사용자 지시로 이후 검증은 한꺼번에 나중에): 노래 쓰기(스타일·가사·구간 9개·클립 막대 18개)·노래 만들기(테이크 1개·재생기)·승인 → 시나리오 이어짐까지. 앞선 확인: 뮤직비디오 문장 → 브리프 → 캐스팅 → **노래 단계 화면(두 선택 카드, 단계 줄)**, "AI로 만들기" 선택. **확인 못 한 것**: 작업팀 노래 쓰기 → 노래 만들기 → 승인 → 시나리오 이어짐, 업로드, 완성 영상 합치기(데모는 카드 이미지), 채팅 `music.generate`, 실제 LLM·GPU·ComfyUI(업로드·Music Generate·Video Stitch·Add Audio), 노래 에셋 등록(코드 완료: `registerSong`, 노래 승인 때 자동 등록 + 화면 버튼, 데모는 프로젝트 에셋만 — 실기 미확인).
- 알게 된 시험 함정: HMR 뒤 콘솔에서 모듈을 import 하면 `?t=` 인스턴스가 달라 "no project" 가 난다 → 화면 버튼을 눌러 확인하거나 페이지를 새로고침 후 한 번에 import.
- 코드만 끝낸 것(2026-10-29, 검증은 나중에 한꺼번에): 생성 중 클립별 진행 막대(`ClipCard`의 `live` = 열려 있는 캔버스의 생성 카드 runtime, 실제 생성 때만 보임), 브이로그 클립의 `dialogue`를 "내레이션"으로 표시(전용 필드는 만들지 않음 — 스키마 변경 없이 라벨만).
- 코드만 끝낸 것(검증 대기): **광고 등 다른 화면비 버전** — `series.versions`(추가 화면비 목록, 스키마 변경 없음), `CanvasLink.aspect`(추가 화면비 캔버스, 주 캔버스는 없음), `canvasAction.makeVersionCanvases/extraAspects/versionLinks`, 캔버스 단계의 `VersionsBlock`(체크 + "다른 화면비 캔버스 만들기" + 열기). 같은 프롬프트·캐스트·시드, 화면비만 다름. 생성은 캔버스에서 손으로(결과는 그 캔버스에 남음, 샷 결과로 안 들어옴). `linkOfEpisode`·`planBatch`·`episodeBlockers`는 `!l.aspect` 로 주 캔버스만 본다.
- 코드만 끝낸 것(검증 대기): **새 모습(의상 변형)** — 캐스팅 카드의 "+ 새 모습"(인물·장소, 이미 변형인 것 제외) → 설명 입력 → `variant_of` 가 붙은 새 항목(프롬프트 = 기본 프롬프트 + 설명). 기본 이미지가 이미 있으면 `buildCastingCanvas`(`opt.baseAssets`)가 변형을 `image-edit` 카드(기본 엔진 klein-edit) + 기본 이미지 Load Image 카드(`n_<ref>_base`)로 만들어 같은 얼굴을 유지한다("Keep exactly the same person… Change only: …"). 기본 이미지가 아직 없으면 글 프롬프트만으로 새로 생성(이후 다시 만들면 편집으로 바뀜). 데모 이미지는 편집 입력에서 제외.
- 코드만 끝낸 것(검증 대기): 캐스트 이미지 선택창(에셋 라이브러리·갤러리)에서 "눈가리기" 목록에 든 그림은 여기서도 흐리게(`Hideable`, `backend/sensitive.ts` 공용 목록).
- **실 테스트 명세서(다른 에이전트용, 코드 수정 금지·문제 전부 보고)**: `docs/DIRECTOR_REAL_TEST_SPEC.md`. 결과 보고서는 `docs/DIRECTOR_REAL_TEST_REPORT.md` 로 올 예정.
- **한꺼번에 하는 검증 목록은 `docs/DIRECTOR_VERIFY_CHECKLIST.md`**. 좁은 창 CSS 는 이미 있음(눈으로 확인만).
- 그 뒤 후보: 좁은 창 편 스트립 확인, 그리고 **한꺼번에 하는 검증**(위 "확인 못 한 것" 목록 + 진행 막대).

### [완료, 화면 검증 전] 반자동 전환 — LLM 오류 대응 + 직접 수정 (2026-10-30 사용자 결정, 이 목록이 다음 작업)
- 배경: 실제 LLM 으로 캐스팅이 계속 실패(저장 프로젝트 `환승연애` 기록: 노드 서버의 "모델이 생각을 적었다" 거절, "JSON 없음" x3, "JSON 중간 깨짐"). 긴 JSON 한 번에 쓰기 + 엄격한 JSON 읽기가 원인. 사용자 결정: **완전 채팅 자동화 -> 반자동**(LLM 이 제안, 사용자가 직접 추가·수정).
- 해야 할 일(순서, 끝낸 것은 [x] 로 바꾸고 커밋):
  1. [x] **JSON 읽기 너그럽게**(`ai.parseReply`): 문자열 안 줄바꿈·따옴표, 항목 사이 빠진 쉼표, 코드 블록, 앞뒤 설명글 허용. 시험 추가.
  2. [x] **실패 시 모델 답의 앞부분을 오류 메시지에 포함**(`directorTurn` 오류 + 채팅 오류 메시지, 앞 300자). 원인이 바로 보이게.
  3. [x] **작게 나눠(구현: `ai.planParts`, `Part`, store.runJob 이 부분마다 호출 · 실패 시 앞부분 보존) 요청**: 캐스팅 = 인물 -> 장소 -> 소품 따로(각 호출 결과를 합침), 시나리오 = 시리즈 개요(시놉시스/로그라인) 먼저 + 편 목록을 묶음(예: 10편씩)으로, 편 작성 = 장면 목록 -> 장면별 클립으로. 각 호출은 짧은 JSON. 한 묶음이 실패하면 그 묶음만 다시(전체 재시도 아님). `kickoffInstruction`/`checkReply`/`runJob` 를 묶음 단위로.
  4. [x] **캐스팅 직접 편집**(구현: `CastGrid` addEntry/saveEntry/removeEntry, `ai.renameReference`): 항목 수동 추가(종류·이름·설명), 설명·이름 수정, 삭제(거절). (`CastGrid` 에 "+ 추가", 카드에 이름/종류 수정).
  5. [x] **시나리오 직접 편집**(구현: `ScenarioList` 제목·줄거리 입력, `EpisodeRefs` 편집 가능): 편마다 제목·줄거리 수정, 출연자·소품·장소를 캐스팅 목록에서 골라 추가/제거(누락 보정). `EpisodeRefs` 를 편집 가능하게.
  6. [x] **편 작성 직접 편집**(구현: `ClipEditor`, 편 작성 단계 승인 대기 중에만; 고치면 합격이 풀리고 생성물이 있으면 draft 로): 클립마다 화면 묘사·대사·음향·음악 수정, 출연자·장소 추가/제거(캐스팅 목록에서 선택), 클립 추가/삭제/순서(길이 합 규칙 유지). `ClipCard` 편집 모드.
  7. [x] 시험 갱신(JSON 보정·부분 요청 시험 추가), 화면 검증은 `docs/DIRECTOR_VERIFY_CHECKLIST.md` 17~21번. **실제 LLM 으로 캐스팅(3부분)·시나리오(틀+8편씩)·편 작성(5클립씩)이 통과하는지는 사용자가 확인 중**.
- LLM 호출 기록: `backend/llmLog.ts`(store) + `llm.ts runLlm` 이 입력/출력 글자수·시간을 기록, 화면은 디렉터 모델 설정 창의 `LlmLog` 표. 토큰은 글자/2.5 어림(서버가 usage 를 주면 그 값). 생각(`</think>`) 앞부분은 `ai.stripThinking` 이 버림 — 단 노드 서버가 먼저 거절하는 경우(여는 태그 없는 `</think>`)는 노드 쪽 수정 필요(요청 대기).
- **[예약 · 2026-11-01 오후 10시 이후에 진행] LLM 라이브 로그**: 사용자가 원하는 것은 모델이 글을 쓰는 동안의 실시간 로그(지금까지 나온 글, 누적 글자/토큰 수, 초당 속도, 생각 과정과 답 구분, 끝났는지). 현재 노드(`/tj_studio_one/llm/enhance`)는 끝난 뒤 한 번에 답하므로 앱 혼자서는 불가. **진행 순서(사용자 지시): LLM(TJ) 구현체는 코어 노드(`ComfyUI-TJ_NODE`)에서 오므로 ① 코어 노드에서 먼저 → ② 스튜디오(`ComfyUI-TJ_NODE_STUDIO_ONE`, `/tj_studio_one/llm/enhance` 라우트가 코어를 받아 넘김) → ③ 웹 세션(`AI-ONE-STUDIO`) → ④ 캔버스 세션(이 저장소)**. 이 저장소가 할 일은 ④ 뿐이고, 앞 단계가 끝나 이식 명세(`SPEC_RELAY_*`)가 오기 전에는 앱 코드를 시작하지 말 것. 이 저장소에서 지금 해 둘 수 있는 것은 사용자에게 시작 여부를 확인(11-01 오후 10시 이후)하고, 코어 노드 세션에 전달할 요구사항 문서(`docs/NODE_SPEC_LLM_LIVE_LOG.md`)를 쓰는 것까지. 요구사항 안: ComfyUI 웹소켓 이벤트(글 조각·누적 글자 수·토큰 수·tok/s·끝남) 또는 스트리밍 응답, 컴피 콘솔에도 한 줄씩 출력, llama.cpp 의 실제 토큰 수 포함. 노드 쪽 명세가 오면 앱에서 디렉터 화면에 실시간 패널(부분별 진행: 예 "캐스팅 인물 1/3 … 1,240자 18 tok/s") 구현, `backend/llmLog.ts` 에 연결. 노드 저장소는 이 저장소 작업에서 수정 금지(명세로만 요청). 그 전에는 시작하지 말 것.
- **라이브 로그 진행 상황 (2026-11-03)**: ① 코어 노드 완료(`ComfyUI-TJ_NODE` 6bba17e, 코어 세션이 알려 옴). 웹소켓 이벤트 `tj_llm_progress` = {call_id, backend, model, phase(prompt|thinking|answer|done|error), input_tokens, output_tokens, chars, tok_per_sec, elapsed_ms, delta, finish_reason(done/error 때)}, 약 0.7초마다. **GGUF/llama.cpp 만 스트리밍**, 다른 백엔드(OpenRouter·Custom·ComfyUI TextGenerate)는 시작(prompt)과 끝(done)만. `backend` 값은 노드 이름 그대로("GGUF / llama.cpp" 등)라 앱에서 local|comfy|ollama|openrouter|custom 으로 매핑해야 함. 최종 응답 usage = {input_tokens, output_tokens, tok_per_sec, elapsed_ms, finish_reason(stop|length|error), thinking_chars, answer_chars}; 이미지 입력(Qwen-VL)의 input_tokens 는 실제보다 작음. 코어도 마지막 `</think>` 뒤만 답으로 처리(앱 `ai.stripThinking` 과 같은 규칙). ② 스튜디오 라우트가 이벤트(와 call_id)를 전달하는 작업은 아직 안 옴 → ③ 웹 → ④ 캔버스(명세 6절). **④ 캔버스 완료(2.30.0, 2026-11-03)**: `llm.ts` 가 call_id 를 보내고 `tj_llm_progress`(comfy 웹소켓)·`usage` 를 `backend/llmLog.ts`(live/entries)로 받아 디렉터 화면(`LiveLlm`)에 표시. 스튜디오 라우트는 스트리밍 없음(시작/끝만, 토큰은 추정 `~`), `length` 미감지. 코어 LLM 노드를 직접 쓰는 카드가 생기면 같은 이벤트로 중간 진행이 보임.
- 원칙: 직접 고친 값은 LLM 재작성이 덮어쓰지 않음(채팅으로 시킨 수정만 바꿈). 편집은 `store.edit` 로(자동 저장).
- 주의(함정): Bash heredoc 으로 한글 파이썬 스크립트를 쓰면 깨진다 -> Write 도구로 .py 를 만들어 실행.

### 최종 검토 시사회 · MP 설정 (2026-10-30, 커밋 e6d7b39, 화면 검증 전)
- `ReviewCard`(DirectorView): 합쳐진 영상 큰 화면 + `dx-minis`(클립 작은 영상 + 한 줄 설명). 합치기(`FinalBlock`)는 '생성·확인' 단계에만 있음. 수정 = 채팅 → `store.send`가 편을 execute 로 되돌림.
- MP: `DirectorSeries.start_mp/final_mp`, `series.mpRanges/defaultMps/turboSettings`, `adapter.genParams`(h3_plain 의 megapixels), `ai.applySeries`, 브리프 `BriefTiles`의 '그림 크기(MP)' 칸.

### 실사용 피드백 7건 반영 (2026-10-30, 코드 완료 — 화면 검증 전, `npm run test:director` 통과)
- 사용자가 실제 LLM 으로 써 본 문제: ① 캐스팅 수정 LLM 결과가 카드에 안 반영 ② 캐스팅 프롬프트가 모델별로 강화되지 않음(카드엔 설정 언어 한 가지면 됨) ③ 시나리오의 레퍼런스(특히 장소) 누락·수정 안 보임 ④ 편 작성 시작 화면에 찌꺼기 ⑤ 클립에 출연자 누락 ⑥ 생성/검토를 합치고 클립별 합격 + 선택 합치기 ⑦ 검토 = 합쳐진 최종 영상.
- 구현: ①②: 캐스팅은 `description` 하나(`prompt_en/ko`는 데이터에 남지만 안 씀; `adapter.castPromptText` = 설명 + 종류 안내, 이미지 카드 `auto_enhance: true`), `applyReply(p, r, { free, episode })`(채팅이면 승인된 항목도 수정), `set_reference.new_name`, `model.findReference` 느슨한 이름 매칭 + `mentionedRefs`. ③: `DirectorEpisode.cast/locations`, 시나리오 검사(`checkReply` series: 편마다 출연자·장소 필수), 화면 `EpisodeRefs`. ④⑤: `applyReply` episode 인자로 편 번호 고정, `ai.repairClipRefs`(클립 글에 나온 이름 → cast, 장소 채움), 쓰는 동안 EpisodeCard 비움. ⑥⑦: `DirectorShot.passed`(합격한 result_id)·`excluded`, `workflow.episodeBlockers`(execute: 포함된 클립 모두 결과+합격+합친 영상 `ep.final`; review: `ep.final`), `adapter` 스티치 선을 매번 순서대로 다시 깔고 제외 클립 뺌, `canvasAction.makeEpisodeCanvas` 모든 종류에 `finish.stitch`, `musicAction.finishEpisode` 합격 검사, `DirectorView` ClipCard(합격·제외)·`FinalBlock`·새 `ReviewCard`, 스토어: 최종 검토 중 채팅 수정이 클립을 바꾸면 `reopenEpisode(…,'execute')`.
- 실 테스트 보고서(docs/DIRECTOR_REAL_TEST_REPORT.md, DeepSeek 에이전트) 반영: T-02 스티치 모든 종류(위), T-01/T-04 `applyReply`는 뮤직비디오만 `music` 적용 + 음악 감독 발언은 뮤직비디오만, T-03 `checkReply` brief 가 사용자가 말한 길이·부작 수와 다르면 거절, T-05 문구. 남은 것: 작은 로컬 LLM(4B 등)의 JSON 끊김은 모델 한계(9B 이상/OpenRouter 권장). 앱에는 LLM 시간 제한이 없음(5분 규칙은 시험 때 로컬 GGUF 판단 기준일 뿐).
- 시험 스크립트도 새 규칙으로 갱신(flow/music/assets). **화면(브라우저) 확인은 안 함** → `docs/DIRECTOR_VERIFY_CHECKLIST.md` 11~16번.

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

### 영상 프롬포트 Minimax H3 Ref2VA + "여러 편 함께" 제거 (2026-11-01, 단위 시험 통과)
- **Ref2VA 조합(#4 보완)**: `compose.clipPromptOf(s, lang, people)` / `composeClipPrompt(s, lang, people)` — `people`(캐릭터 이름, 클립 cast 순서)로 **S1..Sn 페르소나**를 매기고, **공식 H3 구조**로 조합: `integrated_multimodal_description:`(화면 묘사 + `References: @imageN = 이름 (S1)` + `Dialogue: (S1) <d>[Ko/English]…</d>`) → 빈 줄 → `overall_soundscape:` → 빈 줄 → `non_diegetic_music:`. 대사 파서가 `S1: `/`(S1)`/`이름: ` 접두를 인식(미인식은 S1 기본). `model.castPersonas(p, s)` 추가. 호출부(adapter/staleShots/exportPackage/ShotPrompt)가 personas 전달 → 표시·stale 판정·ZIP 일관.
- **작업팀 지시**: `buildSystem` RULES에 H3 Ref2VA 규칙(클립 cast의 인물 = S1.. 순서, prompt_en에 S1/S2로 서술, 대사는 "S1: 줄"·speaker 언어 그대로·번역 금지), episode 지시문에도 동일 + 계약 포맷은 공식 섹션. `episode_plan.dialogue` 스키마 설명 갱신.
- **"여러 편 함께" 제거**: `EpisodeStrip`에서 batchMode 체크박스·편 체크·배치 버튼 제거(승인은 포커스 편 하나), `GenerateCard`의 'ticked' 범위 제거, `DirectorState`에서 `selEpisodes`/`batchMode`/`toggleEpisode`/`setSelEpisodes`/`setBatchMode` 삭제. i18n 힌트 문구 갱신.
- 확인: `tmp-ref2va.mjs`로 실제 조합 출력 확인(페르소나 S1/S2 + `(S1) <d>[Korean]…`), `npm run typecheck`, `npm run test:director` 통과. 사용자 진행 프로젝트(막장…10부작)는 보존(삭제하지 않음).

### 영상 프롬포트 = 공식 Minimax H3 (Video) 시스템 프롬포트로 생성 (2026-11-01, 단위 시험 통과; 실제 LLM 생성 미확인)
- **사용자 지적 반영**: H3 공식 형식을 임의 재구성하지 말 것, **공식 시스템 프롬포트(model_formats.json "Minimax H3 (Video)") 그대로 사용**, 대사 보존(이미 그 프롬포트 룰3에 포함)만 유지.
- `compose.clipPromptOf/composeClipPrompt`를 **공식 강화의 입력용 원문 정보**로 되돌림: `화면묘사 + References: @imageN = 이름 (S1)… + Dialogue: (S1) <d>[lang]…</d> + Sound + Music`. (사람 only S1.. 페르소나; shotSubjects 파라미터 유지.)
- **`canvasAction.generateClipPrompts`(순차)**: 편 작성 승인 → runJob('canvas')에서 **먼저 캔버스 생성+`markEpisodeReview`(5단계 화면 노출)**, 그다음 **클립마다 공식 H3(6섹션 브리프)를 한 개씩** 생성. `shot.prompt_busy`(임시)로 카드에 "프롬포트 생성중…" 표시 → 결과 저장 → 다음 카드. 실패 시 그 클립은 `prompt_user`=원문으로 보존, 전체는 실패로 안 떨어짐. 데모는 `demoOfficialBrief`를 `sleep(260)` 간격으로 순차 적용. 강된 형식은 공식 시스템 프롬포트(`formatFor('video-generate', h3-ref)`)가 결정(속임수 없음).
- **그리드 빈 시작·순차 표시**: PromptGrid/ShotPrompt — `prompt_user` 없으면 카드가 **빈 텍스트(placeholder "프롬프트 없음")** + "대기 중", `prompt_busy`면 "프롬포트 생성중…"(스피너)·비활성, 완료면 "✓ 수정됨". 헤더에 `done/total 생성됨` 진행. "캔버스에서 열기"가 사용자 최종 수정분을 캔버스 카드에 반영 후 열기(자동 실행 없음).
- **편작성 표시**: `Ref2vaBox`(클립 카드·편집 카드·캔버스 그리드)가 `composeClipPrompt`/생성된 `prompt_user`를 표시.
- RULES/지시: 작업팀은 원문(사람 S1/S2, 대사 "S1: 줄" 원어)을 쓰고, 공식 프롬포트가 브리프로 강화한다고 명시(팩션 문구 제거).
- 주의: `generateClipPrompts`는 실제 LLM 호출(클립마다) — 비용 영향. 실패 시 `prompt_user` = 원문으로 두어 그리드 보존. 실제 렌더 파싱은 사용자 서버 실기로 확인 필요.

### LLM 오류 완화 · 생성·확인 프롬포트 · 순차 편작성 · 대사 보존 (2026-11-01, 단위 시험 통과 + 데모 브라우저 일부 확인)
- **원문 답변 보기/다운로드(#4)**: `ChatMsg.raw` 추가, `ai.directorTurn` 실패 시 `CrewError`(`raw` 포함, 메시지에 앞부분 요약)를 던지고, `store`의 3곳 catch(runJob/send/recast)가 `raw`를 오류 채팅에 붙임. `ChatDock`이 오류 메시지에 `.dirx-raw` details(모델이 보낸 원문, 다운로드 버튼)를 렌더.
- **묶음 일부 보존(#4)**: `planParts`가 episode는 **이미 쓴 클립 수 기준**으로, series는 기존 격차 기준으로 다시 계산 → `runJob`의 series/episode를 **동적 루프**(`unitProgress`로 진행도, 무진척이면 실패해 기존 것 보존)로 바꿈. `checkReply`는 part(그룹)일 때 **1~N개 허용**(몇 개만 와도 진행, 번호 범위 초과·개수 초과만 거절), part 없을 땐 기존처럼 정확 수량. 지시문도 "EXACTLY N"→"1 to N, 빠진 것만 다시"로. `ai.unitProgress`/`plannedEpisodeClips` export. 데모 크루도 그대로 응답 가능.
- **생성·확인 프롬포트(#1)**: `PromptGrid`에 `apply` prop 추가(적용 버튼), `GenerateCard`에 `PromptGrid` 삽입 + `applyPrompts` = `makeEpisodeCanvas(no)`(캔버스 카드에 반영) 후 안내. 캔버스 단계는 기존 "캔버스에서 열기"가 적용 겸함.
- **대사 보존(#2)**: `composeClipPrompt(s, lang)`이 대사를 `<d>[Ko/English]…</d>`로 감쌈(호출부가 `p.series.language` 전달: adapter/staleShots/exportPackage/ShotPrompt). `engine/run.ts` 자동강화 `extra_instructions`에 "`<d>..</d>`는 원문 그대로", 시스템 규칙에 "대사는 번역 금지·`<d>` 그대로" 추가.
- **순차 편작성(#3)**: `DirectorEpisode.handoff`, `continuity.episodeHandoff`(최종 검토 승인 시 저장, `workflow.approveEpisode` review 분기), `workflow.startEpisodes`가 **이전 편이 done일 때만 다음 한 편 시작**(여러 개 줘도 한 편만), 저장소가 "이전 편을 먼저 완성" 안내. `kickoffInstruction('episode')`이 이전 편의 handoff를 지시문에 포함. 편 스트립에서 동시 작성(Start writing) 버튼 제거(작성은 편 페이지에서).
- 시나리오 수동 추가(#4c): `ScenarioList`에 "빠진 편 추가"(`newEpisode`로 빈 행).
- 시험: flow/adapter 갱신(묶음 일부 허용, 순차 start, handoff·지시문, 오류 문구 "The model said", clipPromptOf `<d>`), `npm run typecheck`·`npm run test:director` 전체 통과.
- 데모 브라우저(8766)에서는 **캐스팅 데모 흐름**(브리프→캐스팅 5카드)과 vite가 새 코드(적용 버튼·순차 startEpisodes·recast)를 서빙하는 것까지 확인. **생성·확인 프롬포트 카드·"적용"·원문 답변 details의 브라우저 확인은 이번 라운드 탭 세션 문제로 미완료** — 로직은 단위 시험(adapter/flow)으로 커버.
- **확인 못 한 것**: 실제 LLM/GPU로 묶음 일부 보존·순차 편작성·대사 보존 작동, `engine/run.ts` 강화가 `<d>`를 지키는지(모델 의존), 캔버스 파일에 적용된 반영의 실기, 생성·확인 프롬포트 카드·원문 답변 UI의 브라우저 확인.

### 캔버스 단계: 클립별 영상 프롬포트 검토·수정 + 생성 유지 (#4/#5) (2026-11-01, 데모 브라우저 확인 · 실제 GPU 미확인)
- 목적: 편 작성 승인 → 전체 클립을 영상 프롬포트로 만들어 캔버스 탭에서 클립별로 보고 고치고, "캔버스에서 열기"로 전부 캔버스 카드에 적용하며, 생성·확인으로 넘어가도 적용된 프롬포트·캔버스 설정을 유지한 채 생성을 진행.
- 데이터: `DirectorShot.prompt_user`(사용자가 쓴 전체 프롬포트; 있으면 조합본 대신 사용). `compose.clipPromptOf` = `prompt_user || composeClipPrompt`. **이 글을 보여 주거나 stale을 판정하거나 패키지에 넣는 곳은 모두 `clipPromptOf`를 쓴다**: `adapter`(캔버스 프롬포트 카드 글), `execution.staleShots`, `exportPackage`(prompts.md, clips.json의 prompt_for_model).
- adapter: `prompt_user`가 설정된 클립은 카드 글을 **무조건 덮어씀**(그리드가 최신 사용자 의도 — `keptUserText` 우회). 설정 안 된 클립은 기존 규칙 그대로(캔버스에서 직접 고친 글은 유지). 기존 생성 카드의 파라미터·엔진·결과·위치는 건드리지 않으므로 캔버스에서 바꾼 옵션이 보존된다.
- 화면: `CanvasCard`(이제 `ro` prop) 위에 `PromptGrid`(`.dx-canvasgrid` 최대 4열) — `ShotPrompt` 카드마다 텍스트 영역, "수정됨/원본" 배지, 카드별 "원래 글자로 되돌리기", 위쪽 "프롬포트 전체 되돌리기". 저장은 blur 시 `prompt_user`(조합본과 같아지면 삭제). React key = `shot_id:edited?`로 수정 상태 전환이 화면에 반영. "캔버스에서 열기" = `makeEpisodeCanvas`(적용) → `openLinkedCanvas`(열기만, 자동 실행 없음) — 데모는 열기 안내를 띄움.
- 생성 때 유지(#5): `generateBatch`가 실행 전 `makeEpisodeCanvas`로 다시 빌드해도 adapter가 기존 카드를 보존하므로 적용된 프롬포트(`prompt_user`)와 캔버스 설정이 생성 카드에 그대로 남아 실행된다.
- 시험: `scripts/test-director-adapter.mjs`에 `clipPromptOf`, 그리드 프롬포트 적용(스테일 카드도 덮어씀)·`prompt_sent` 갱신·지우면 조합본 복귀, `staleShots`가 `clipPromptOf` 기준으로 잡는지 추가. `npm run typecheck`·`npm run test:director` 통과.
- 데모 브라우저(8766) 확인: 캐스팅(프롬토 확인 5/5 후 일괄 생성 5/5) → 시나리오 → 편 작성 3클립 승인 → **캔버스 탭에 3개 프롬포트 카드(4열)** → 2번 클립 수정 → "1/3 수정됨"·✓ 배지 → 저장 파일에 `prompt_user` 확정 → "캔버스에서 열기"(데모라 열기 안내, 적용 경로 실행) → 승인 → 생성·확인 자동 생성 **3/3** → 캔버스 탭 다시 보기(수정 유지) → "원래 글자로 되돌리기"로 0/3 복귀.
- **확인 못 한 것**: 실제 캔버스 파일에 적용된 카드 글(GPU·ComfyUI `runNode`로 실제 프롬포트가 생성에 쓰이는지), 사용자가 캔버스에서 고친 엔진·옵션을 생성·확인에서 그대로 쓰는 실기 경로.

### 캐스팅 카드 관리 · 화면 폭 (2026-11-01, 데모 브라우저 확인)
- 카드별 **개별 삭제**: `CastCard` 동작 줄에 `🗑 삭제` 버튼(기존 `removeEntry` 확인을 재사용, 설명창 안의 "Remove this entry" 제거). 편집창과 분리되어 찾기 쉬움.
- **다시 캐스팅**(전체/배우/장소/소품): `store.recast(kinds)` — busy 가드, 작업 복사본에서 해당 종류만 `model.dropReferences`(이름을 편·클립에서도 정리, `variant_of` 연결 해제) 후 종류별로 `directorTurn(…, recastInstruction(work, kind), …, { kickoff:'references', part:{kind} })`. 전부 성공해야만 본 프로젝트에 교체 적용(`dropReferences` + 새 항목 push + `syncShotAssets`), 성공 시 `references` 다시 `review_required` + 캐스팅 임시 캔버스 제거. 실패·취소 시 원래 stage/status 복원 + 채팅 오류. `ai.recastInstruction`은 "Casting, one part at a time" + `every entry with kind "<kind>"` 문구 유지(데모·검사가 그대로 응답), 기존 이름·룩 재사용 금지 지시.
- **채팅창 폭 조절**: `DirectorView`에 `.dirx-split` 구분선(드래그·Arrow 키·두 번 클릭 기본값), CSS `--dock-w`(기본 `min(42%, 560px)`), 클램프 `300px ~ (body−420px)`, `localStorage 'canvers.director.dock'`, ≤900px은 숨김. 기존 `max-width:560px` 제거.
- **결과 90%**: `.dx-page` = `width:90%; margin:0 auto`(기존 `max-width:980px` 제거), ≤900px `width:100%`.
- **카드 그리드 최대 열**: `repeat(auto-fill, minmax(max(<기존최소>, calc((100%−gap)/N)), 1fr))` — 캐스팅(`.dx-castgrid`) 5 · 시나리오(`.dx-epgrid`) 4 · 편+생성·확인(공용 `.dx-clips`) 4 · 예비 `.dx-canvasgrid` 4. 폭이 줄면 자동 감소. ≤900px `.dx-castgrid`는 150px 자유(계속 1~5).
- 시험: `scripts/test-director-flow.mjs`에 `recastInstruction`·`dropReferences` 검사 추가. `npm run typecheck`·`npm run test:director` 통과. 실행 전/후 데모 브라우저(8766)로 삭제·다시 캐스팅(배우만)·구분선·그리드 열 수(와이드/중간/좁은 폭) 확인.

### 캐스팅: 프롬프트 확인 뒤 이미지 생성 + 임시 캐스팅 캔버스 (2026-11-01, 데모 브라우저 확인 · 실제 LLM/생성 미확인)
- 사용자 지시: **캐스팅 카드 → 카드 내용 확인 → 이미지 프롬프트 생성 → 프롬프트 확인 → 이미지 생성** 순서. 이유: 설명에 "한국인"이라고 썼는데 외국인 얼굴이 나왔다 — 서버의 일반 강화 프롬프트가 국적을 떨어뜨리기 때문. 이제 만들기 전에 프롬프트를 눈으로 보고 고칠 수 있다.
- **위 "실사용 피드백 7건"의 "설명 하나 + `auto_enhance:true`" 는 이 작업으로 대체됨.** 확인한 프롬프트가 있으면 그것을 그대로 쓰고 `auto_enhance:false`(두 번 고치지 않음), 없으면 예전처럼 설명 + `auto_enhance:true`.
- 데이터(스키마 올리지 않음): `DirectorReference.prompt_ok`(확인함)·`prompt_engine`(어느 이미지 모델용인지), `CanvasLink.enhance_sent`(어댑터가 카드에 마지막으로 준 자동 강화 값 — 캔버스에서 사용자가 바꾼 스위치는 유지).
- 판정: `adapter.hasCastPrompt(r, engine)` = `prompt_ok` + 비어 있지 않은 `prompt_en` + (`prompt_engine` 비었거나 같은 엔진). `castPromptOf` 가 프롬프트 카드 글을 정한다. `generateCast` 는 준비 안 된 항목이 있으면 `Make and check the image prompt first` 로 막는다(기본 이미지가 있는 "새 모습" 변형 = 이미지 편집이라 예외).
- 프롬프트 작성: `canvasAction.writeCastPrompts` — 카드의 자동 강화와 같은 경로(`runLlm({style})` → `/tj_studio_one/llm/enhance`, `formatFor('image-generate', engine)` + `NO_AESTHETIC`). 모델 포맷은 서버가 `ComfyUI-TJ_NODE/nodes/llm/data/model_formats.json` 으로 붙인다. 추가로 `CAST_PROMPT_RULE`(`extra_instructions`)에 "국적·인종·나이·성별·피부·머리·눈·체형·의상·장소·꼭 나와야 하는 문구를 번역만 하고 빠뜨리지 말 것"을 넣었다.
- 화면: `CastCard` 의 "이미지 프롬프트" 칸(만들기/다시 만들기/고쳐서 확인/"설명 그대로 쓰기"), 확인 전에는 그 항목 생성 버튼 잠김. `CastGrid` 에 프롬프트 형식·`프롬프트 확인 n / m`·"프롬프트 전체 만들기". 설명을 고치면 확인이 풀린다(`prompt_ok=false`; `ai.ts` 의 채팅 수정과 카드의 설명 고치기 모두).
- **임시 캐스팅 캔버스**: `openCastingCanvas`(빌드+저장+열기만, 생성 없음) / `removeCastingCanvas`(승인하면 링크 제거 + 파일 삭제, 그 파일이 열려 있으면 그래프 새로 시작). 호출은 `store/director.approve` 의 `references` 승인. 목적: 카드·연결을 캔버스에서 보고 카드별 모델을 바꿔 실행. 데모는 파일을 만들지 않아 버튼 비활성. 편 캔버스와 파일 이름이 달라 서로 덮어쓰지 않는다.
- 바꾼 파일: `src/director/types.ts`, `adapter.ts`, `canvasAction.ts`, `DirectorView.tsx`, `ai.ts`, `../store/director.ts`, `../i18n.director.ts`, `src/styles.css`, `scripts/test-director-assets.mjs` (+ 이 문서, `CHANGELOG.md`).
- 데모 브라우저로 확인: `0 / 3` 에서 전체 생성 잠김 → 프롬프트 만들기·확인 → `3 / 3` → 3장 생성 → 설명을 고치면 그 카드가 다시 "이 프롬프트 확인"으로 돌아가고 생성 잠김. 캐스팅 캔버스: 데모를 잠시 끄고 열기 → 파일 생성(프롬프트 3 + 이미지 3 카드, 확인한 글) → 캐스팅 승인 → 파일 삭제·`canvas_links` 비움·열려 있던 캔버스 그래프 초기화 확인. 좁은 창(320px)에서 프롬프트 칸이 한 줄로 접히지 않게 CSS 조정.
- **확인 못 한 것**: 실제 LLM 이 `CAST_PROMPT_RULE` 을 지켜 국적을 유지하는지(모델 품질 문제), 실제 모델로 확인한 프롬프트를 `auto_enhance:false` 로 보내는 생성, 캔버스에서 카드별 모델을 바꿔 실행 → 결과 가져오기.
- **기존 프로젝트**: 예전 캐스팅에는 확인된 프롬프트가 없어 "프롬프트 없음"으로 보인다. 프롬프트를 만들고 확인해야 이미지를 만들 수 있다(예전 자동 강화 결과를 검토 없이 쓰지 않게 일부러 막음).

## 9. 작업을 끝낼 때
1. `npm run typecheck`(필요하면 `npm run build`) 통과 확인, 시험용 서버(8766)·임시 파일 정리.
2. `CHANGELOG.md` 맨 위에 새 항목 추가. 구조·방침이 바뀌면 `docs/HANDOFF.md`(제목 버전 포함)와 `docs/ARCHITECTURE.md` 도 갱신.
3. 릴리즈할 때만: 버전 4곳 갱신 → `npm run build:mcp` → 커밋 → 태그 → 푸시 → `gh release create`.
4. 보고는 항목별로 "이식함 / 해당 없음(이유) / 검증 못함", 바꾼 파일, 확인할 점을 적는다.
5. 사용자에게는 새 버전을 쓰려면 서버를 끄고 `start.bat` 으로 다시 시작해야 한다고 알린다.

## 10. Claude Code 전용 기능에 기대는 부분 (다른 모델은 일반 텍스트 규칙으로 대신)
- `.claude/launch.json`(미리보기 서버 정의, 포트 8765 — 운영 서버와 겹치니 직접 쓰지 말고 §4 의 8766 방식) 외에 이 저장소에 skills·훅은 없다(확인함).
- 세션 간 메시지(`SendMessage`, 스튜디오 세션 연락)와 자동 메모리는 Claude Code 기능이다. 다른 모델은 사용자에게 직접 확인받고, 위 §6 규칙을 그대로 지킨다.
