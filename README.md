# AI ONE Studio Canvers

노드 캔버스로 이미지를 만드는 웹 화면(프론트엔드)입니다.
**생성·LLM 같은 실제 작업은 전부 [ComfyUI-TJ_NODE_STUDIO_ONE](https://github.com/designloves2/ComfyUI-TJ_NODE_STUDIO_ONE) 가 설치된 ComfyUI(백엔드 API)** 가 처리하고,
LLM 4가지 방식은 [ComfyUI-TJ_NODE](https://github.com/designloves2/ComfyUI-TJ_NODE) 의 `LLM (TJ)` 노드와 동일합니다.

> 캔버스 구조는 [freavy](https://github.com/FrameDeptCo/freavy)(MIT)의 개념을 분석해 **코드 복사 없이 새로 구현**했습니다.

## 실행 방법 (3단계)

1. ComfyUI에 `ComfyUI-TJ_NODE_STUDIO_ONE`, `ComfyUI-TJ_NODE` 를 설치하고 ComfyUI를 켭니다 (기본 주소 `127.0.0.1:8188`).
2. (모델 다운로드를 쓰려면 `set COMFY_DIR=C:\ComfyUI\ComfyUI` 처럼 ComfyUI 폴더를 지정) 이 폴더에서 **`start.bat`** (Windows) 또는 `./start.sh` (Mac/Linux) 를 실행합니다.
   - 처음 한 번은 Node.js(18 이상)가 필요합니다. 패키지 설치와 빌드는 자동입니다.
   - ComfyUI 주소가 다르면 `COMFY_URL` 환경변수로 지정: `set COMFY_URL=http://192.168.0.10:8188`
3. 브라우저에서 **http://localhost:5917** 을 엽니다.

왼쪽 **모델** 탭에서 연결·모델·필수 커스텀 노드가 갖춰졌는지 한눈에 확인할 수 있습니다.

## 사용법

| 동작 | 방법 |
|---|---|
| 노드 추가 | 빈 곳 더블클릭 또는 `Tab` → 검색 후 Enter. 왼쪽 **노드** 탭에서 끌어다 놓기도 가능 |
| 연결 | 오른쪽 점을 끌어 다른 노드의 왼쪽 점에 연결 (타입이 같은 색끼리) |
| 실행 | 노드의 ▶ (앞단 노드가 비어 있으면 자동으로 먼저 실행), 아래 **전체 실행** |
| 이미지 불러오기 | 파일을 캔버스에 끌어다 놓기 / 붙여넣기(Ctrl+V) / 가져오기 노드 |
| 결과 크게 보기 | 결과 이미지 더블클릭 (휠=확대, 드래그=이동, ←/→=이전/다음 결과) |
| 저장 / 열기 | 상단 ⤓ / ⤒ (`.canvers.json`), 자동 임시저장 |
| 심플 모드 | 상단 **심플** — 프롬프트 입력 → 생성 (Higgsfield 스타일 피드) |

## LLM 설정 (설정 → LLM 백엔드)

`LLM (TJ)`, `프롬프트 강화`, `이미지 설명` 노드와 심플 모드의 ✨는 여기서 고른 방식을 씁니다.

1. **로컬 GGUF (llama.cpp)** — ComfyUI 안에서 .gguf 모델 실행
2. **ComfyUI TextGenerate** — ComfyUI 자체 텍스트 인코더 LLM(예: Gemma)
3. **OpenRouter** — 클라우드 모델 (키는 서버에 저장, 화면엔 마스킹 표시)
4. **Connect Custom** — LM Studio · Ollama · llama.cpp 서버 등 OpenAI 호환 주소 (키는 서버 메모리에만 보관)

설정은 서버에 저장되어 브라우저를 바꿔도 같습니다. `Test` 버튼으로 바로 확인하세요.

## 지원 현황 (v1.1)

| 구분 | 상태 |
|---|---|
| 이미지 생성/편집/인페인트/아웃페인트: Z-Image Turbo, Flux.2 Klein, Krea 2, SDXL, Anima, Qwen Image Edit 2511, Qwen Image 2.1 | ✅ |
| 얼굴 교체(Klein), 배경 제거, 업스케일(ESRGAN 계열) | ✅ |
| **비디오: LTX 2.5** (텍스트→영상, 첫/마지막 프레임→영상, 오디오 포함, 2단계 업스케일) | ✅ |
| **비디오: MiniMax H3 전체** — 텍스트 / 첫·마지막 프레임 / 멀티 레퍼런스(9장), 여러 클립(`---`로 구분) + 마지막 프레임 이어가기 + **One-Take(latent 연속)** + 자동 스티치, **Audio Lock**, Turbo 3종(larryvrh · Turbo LoRA Basic · lightx2v/SLA), **7+1 하이레스 마무리**, 어텐션 백엔드·패치·캐시·H3 최적화·Spectrum | ✅ |
| **음악: Ace-Step 1.5 / MiniMax Music 3 / YuE2** (스타일+가사 → 오디오) | ✅ |
| **YuE2 전체** — 텍스트→음악(자동 ABC), **커버 음악**(녹음 파일), **멜로디 에디터**(피아노롤·MIDI 건반/컴퓨터 키보드 녹음·MIDI 가져오기/내보내기·재생) → YuE2 멜로디로 연결 | ✅ |
| **모델 다운로드 관리자** (모델 탭 — `COMFY_DIR` 설정 시 ComfyUI/models 로 직접 내려받기) | ✅ |
| **ComfyUI Workflow 노드** — API 형식 JSON을 불러와 어떤 워크플로우든 실행 (MiniMax H3, Wan 등 비디오 포함) | ✅ |
| **MCP 서버** — Claude Code 등에서 생성·캔버스 실행 | ✅ |
| 브라우저 편집 노드 20종, 페인터(마스크 그리기) | ✅ |
| LLM 노드 3종 + 4가지 백엔드, 프롬프트 노드 ✨ 강화 버튼 | ✅ |
| 그룹, 잠금, 실행취소/다시실행, 비교, 메모, 갤러리 | ✅ |
| freavy 전용: Foley · Image→3D · Alpha Matte · Mask by Text | ➖ 미포함 |
| H3 부가 기능: Asset Library(@토큰), Face Refine, Postprocess 체인, Character Sheet, 프롬프트 에디터(LLM 브리프) | ➖ 미포함 (STUDIO_ONE 노드 UI 전용 기능) |

**그 밖의 비디오/고급 H3:** ComfyUI에서 워크플로우를 `Save (API Format)`으로 저장 → `ComfyUI Workflow` 노드에서 불러오기 → 프롬프트·이미지·시드 칸 선택.

**모델 위치 설정:** 설정 탭의 *이미지/비디오/음악 모델*에서 파일을 고르거나 `(auto)`로 두면 STUDIO_ONE에 저장된 선택 또는 파일 이름으로 자동 선택합니다.

## Claude에서 쓰기 (MCP)

```
npm run build:mcp
claude mcp add canvers -e COMFY_URL=http://127.0.0.1:8188 -- node C:\경로\AI-One-Studio-Canvers\mcp\server.mjs
```

도구: `canvers_generate`(이미지·편집·비디오·음악 한 번 실행), `canvers_llm`, `canvers_build_canvas`(프롬프트 여러 개 → 캔버스 파일), `canvers_run_canvas`(캔버스 파일 실행), `canvers_list_nodes`, `canvers_status`.

자세한 구조·백엔드 API 목록은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 개발

```
npm install
npm run dev        # http://localhost:5917 (ComfyUI는 COMFY_URL 로 프록시)
npm run typecheck
npm run build && npm start
npm run mock       # GPU 없이 UI 시험용 가짜 ComfyUI (:8188)
```

## H3 여러 클립 쓰는 법
영상 생성 노드(H3)에 프롬프트를 **`---` 한 줄로 구분**해서 넣으면 클립이 여러 개 만들어집니다.
- *Several clips*: `lastframe`(앞 클립의 마지막 장면에서 이어서) · `onetake`(latent 그대로 이어서, TJ_NODE 필요) · `none`
- *Stitch*: 끝나면 ffmpeg로 하나의 영상으로 합칩니다 (STUDIO_ONE 의 stitch 라우트 사용).
- **Lock audio** 포트에 오디오(음악 노드 결과·가져온 파일)를 연결하면 그 소리에 맞춰 생성합니다.
