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
| 모델 목록 / 저장된 선택 | `GET /{flux_klein,z_image_turbo,krea2_one,sdxl_one}/{models,config}` |
| 갤러리 / 삭제 / 입력 복사 | `GET …/gallery`, `POST …/delete`, `POST …/copy_to_input` |
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
| Video Generate / Foley / Image→3D / Alpha Matte / Mask by Text | 🔜 (비디오는 H3·LTX 라우트로 연결 예정) |
| 모델 다운로드 관리자, MCP 서버 | 🔜 |

## 새 모델 계열 추가 순서
1. `backend/studio.ts` 의 `FAMILIES` 에 라우트 접두사 추가
2. `backend/imageGen.ts` 에 그래프 빌더 추가
3. `registry/index.ts` 의 해당 노드 `engines` 에 항목 추가
