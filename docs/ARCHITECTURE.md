# 구조

```
브라우저 (이 앱, React + React Flow)
   │  같은 주소로 요청 (serve.mjs / vite 프록시가 ComfyUI로 전달, Origin 보정)
   ▼
ComfyUI :8188  ── 표준 API: /prompt /ws /upload/image /view /history /object_info
   └─ ComfyUI-TJ_NODE_STUDIO_ONE ── 추가 라우트 (아래)
   └─ ComfyUI-TJ_NODE            ── LLM (GGUF / TextGenerate) 구현체
```

## 사용하는 백엔드 API

| 용도 | 라우트 |
|---|---|
| 워크플로우 템플릿 (Klein) | `GET /flux_klein/workflow_{t2i,i2i,edit,inpaint,faceswap,remove_bg}` |
| 모델 목록 / 저장된 선택 | `GET /{flux_klein,z_image_turbo,krea2_one,sdxl_one,anima_one,qwen2511_one,qwenimage21_one}/{models,config}` |
| 갤러리 / 삭제 / 입력 복사 | `GET …/gallery`, `POST …/delete`, `POST …/copy_to_input` |
| 음악 모델/설정 | `GET /music_one/{models,config}` |
| LTX 모델/가용 노드 | `GET /ltx25_one/{models,node_availability}` (없으면 `/minimax_h3_one/models`) |
| LLM 카탈로그 | `GET /tj_studio_one/llm/models` |
| LLM 텍스트 (4방식 공통) | `POST /tj_studio_one/llm/enhance` (`backend`: local · comfy · openrouter · custom) |
| LLM 비전 (4방식 공통) | `POST /tj_studio_one/llm/image_to_prompt` |
| OpenRouter 키/모델 | `POST /tj_studio_one/llm/config` |
| Connect Custom 연결 시험·키 전달 | `POST /tj_shared/custom_llm/connect` (역할 `img_enhance`, `img_i2p`) |
| LLM 설정 서버 저장 | `GET/POST /tj_shared/llm_settings` (이 앱은 `canvers_llm_*` 키만 사용) |

## 코드 지도 (`src/`)

| 폴더/파일 | 역할 |
|---|---|
| `registry/index.ts` | 노드 정의(포트·파라미터·엔진). 새 노드는 여기에 추가 |
| `engine/run.ts` | 그래프 실행기: 앞단 노드부터 순서대로 실행, 편집 노드는 결과 캐시 |
| `engine/actions.ts` | 실행/중지/전체실행, 파일 저장·열기, 심플 모드 실행 |
| `backend/comfy.ts` | ComfyUI 표준 API (업로드, 큐, WebSocket 진행률, 히스토리 폴백) |
| `backend/imageGen.ts` | 모델 계열별 ComfyUI 그래프 생성 (Klein=템플릿 패치, 나머지=직접 구성) |
| `backend/llm.ts` | LLM 4방식 클라이언트 + 서버 설정 동기화 |
| `backend/ltx.ts` (LTX 2.5 + Director 타임라인: 구간 프롬프트·이미지 고정·오디오/모션 트랙), `backend/h3.ts`, `backend/music.ts`, `backend/workflow.ts`, `backend/catalog.ts` | LTX 2.5·MiniMax H3 비디오, Ace-Step/MiniMax/YuE2 음악, 모델 카탈로그, 임의 API 워크플로우 |
| `mcp/server.ts` | MCP 서버 (`npm run build:mcp` 로 `mcp/server.mjs` 생성) |
| `backend/studio.ts` | STUDIO_ONE 라우트 래퍼, 모델 자동 선택 |
| `editing/ops.ts` | 브라우저(Canvas 2D) 이미지 연산 |
| `canvas/*` | React Flow 캔버스, 노드 카드, 뷰어, 페인터 |
| `panels/*`, `simple/*` | 사이드 패널, 설정, 심플 모드 |

## freavy 기능 대응

| freavy | 이 앱 |
|---|---|
| Canvas / Simple 모드 | ✅ 동일 개념으로 구현 |
| 프롬프트·결합·강화·이미지설명·Run Any LLM | ✅ (`LLM (TJ)`가 Run Any LLM 역할, 4백엔드) |
| Image Generate/Edit/Inpaint/Upscale/Remove BG | ✅ STUDIO_ONE 백엔드 (모델 4계열) |
| 편집 노드(crop…pixelate), Painter, Blend, Matte | ✅ |
| Import/Export/Preview/Router/Compare/Note/Number/Text/Toggle/Seed, 그룹 | ✅ |
| ComfyUI Workflow 노드 (임의 API 워크플로우 → 비디오 포함) | ✅ |
| Video Generate (LTX 2.5 · MiniMax H3) | ✅ |
| MCP 서버 | ✅ |
| Foley / Image→3D / Alpha Matte / Mask by Text | 🔜 |
| 모델 다운로드 관리자 | ✅ (`server-lib/downloads.mjs`, Hugging Face 링크만 허용, `COMFY_DIR` 필요) |

## 새 모델 계열 추가 순서
1. `backend/studio.ts` 의 `FAMILIES` 에 라우트 접두사 추가
2. `backend/imageGen.ts` 에 그래프 빌더 추가
3. `registry/index.ts` 의 해당 노드 `engines` 에 항목 추가

## Card architecture (v2.1)
- Every function is a **card** (`src/registry/index.ts` NodeDef). Ports are typed (`text image video audio mask number pipe lora any`); `compatible()` decides which wires are allowed.
- Small **option cards** (LoRA, H3 Turbo·7+1, H3 Speed, H3 Audio Lock, Asset Library) output JSON text assets (`kind: lora|turbo|speed|lock|assetlib`) that generator cards read via `cardLoras()` / `h3Cards()` (`src/engine/more.ts`).
- Runners live in `src/engine/run.ts` + `src/engine/more.ts` (EXTRA_RUNNERS); they build ComfyUI API graphs in `src/backend/*` and call STUDIO_ONE / TJ_NODE routes (`/minimax_h3_one/*`, `/ltx25_one/*`, `/tj_node/reflib/*`, `/h3_facerefine/scan`).
- Postprocess = one card per step (`src/backend/post.ts`), Face Refine (`faceRefine.ts`), Character Sheet (`charSheet.ts`), LTX refine (`ltxRefine.ts`), H3 still image (`h3Image.ts`).
- Canvas UX: wire-drop menu, auto-connect on add, right-click menu, Decks (`src/decks.ts`).
- The v2.0 "Studio Host" (`src/host/*`, original panels loaded at runtime) is kept only as an optional legacy mode (Settings).

## 카드 목록 (v2.6, 카테고리별)
- **입력/출력**: Load Image / Video / Audio, Result Viewer, Preview, Export
- **옵션 카드** (선으로 생성 카드에 연결): LoRA, H3 Turbo·7+1, H3 Speed & Attention, H3 Audio Lock, Asset Library
- **이미지**: Image Generate / Edit / Inpaint / Upscale (SeedVR2 포함), H3 Image, Z-Image ControlNet, Face Redraw, Camera Angle (Qwen), Krea2 Control / Identity Edit, Anima LLLite, Character Sheet
- **비디오**: Video Generate (H3 / H3 Reference / LTX 2.5), LTX Director (타임라인 + 오디오 트랙 + 모션 가이드), Video Edit (LTX refine), Video Stitch, Add Audio to Video, Transition Bridge
- **후처리**: Deblur, Denoise, Video Upscale, Skin Retouch, Film Grain, Interpolation, Resize, Face Refine
- **오디오**: Music Generate (엔진 선택: Ace-Step / MiniMax / YuE2 — 카드 하나로 유지), Music Writer (LLM)
- **분석(ITDA)**: Scene Detect, Beat Detect

## LTX Director 데이터 흐름
`ltx-director` 러너(`engine/more.ts`) → `buildLtxGraph`(`backend/ltx.ts`) → `LTXDirectorTJ25` 노드의 `timeline_data` JSON.
- 단위는 프레임(24fps). `segments`(텍스트/이미지), `audioSegments`(`audioFile`), `motionSegments`(`videoFile`, `videoStrength`) 를 채우고 `use_custom_audio` / `use_custom_motion` 을 켠다.
- 파일은 ComfyUI input 폴더에 업로드(`ensureInput`)한 상대 경로.

## 테스트 / 개발
- 로컬 실제 ComfyUI(8188)에 바로 붙여 테스트한다: `npx vite` (포트 8765) (mock 서버는 쓰지 않음).
- 릴리스 전 매번 `npm run build:mcp`.

## Director Mode (src/director/, 모드: Director / Canvas / Simple)
사용자는 제작자(채팅으로 지시), AI 작업팀(LLM JSON 프로토콜)이 결과를 만들고 사용자가 승인한다. 상세·진행·검증 목록은 `CLAUDE.md` §8, `docs/DIRECTOR_MODE_*.md`, `docs/DIRECTOR_VERIFY_CHECKLIST.md`.
- 흐름: 브리프 → 캐스팅 → (뮤직비디오만) 노래 → 시나리오 → 편마다 [작성 → 캔버스 → 생성 → 검토]. 편마다 자기 단계(`workflow.ts`).
- 순수 로직(DOM·네트워크 없음, `scripts/test-director-*.mjs`): `types/model`(스키마 5, 마이그레이션) · `workflow` · `ai`(작업팀 프로토콜) · `series`/`formats`(작품 종류 6종) · `music`(노래 구조) · `adapter`(Director→캔버스, 멱등) · `execution`(실행 계획·결과 가져오기) · `continuity`(이전 작품 이어서) · `exportPackage`/`zip`.
- 앱 쪽: `DirectorView.tsx` · `canvasAction.ts`(캔버스 만들기·생성·ZIP·다른 화면비) · `musicAction.ts`(노래 업로드·생성·완성 영상) · `store/director.ts`(상태·작업 큐·자동 저장) · `backend/director.ts` + `server-lib/director.mjs`(저장: `director/` 폴더) · `demoCrew.ts`/`demoMedia.ts`(LLM·GPU 없이 전 단계 체험).
- 캔버스 연결: 편마다 캔버스 1개(+ 다른 화면비 캔버스, 캐스팅 캔버스, 노래 캔버스), 고정 카드 id 로 멱등, 사용자가 캔버스에서 바꾼 텍스트·모델·시드는 유지.
