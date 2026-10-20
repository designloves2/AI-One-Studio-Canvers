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
| 심플 모드 | 상단 **심플** — 프롬프트 입력 → 생성 (대화 말풍선 화면, 결과 클릭 시 확대) |

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

## v2.8 — 제작 모드
라이브 캔버스에 프로젝트 이름만 말하면("맥도시락 30초 광고 영상 만들 준비해줘", "…뮤직비디오", "…브이로그", 숏폼·예고편·스토리보드 등) 기획안 메모, 샷 프롬프트, 레퍼런스 이미지, 영상 카드, 이어붙이기까지 구성합니다. 미리 만든 **제작 덱 7종**을 불러와 내용을 채우고, 모든 카드를 자유롭게 조합합니다. 입력창 ⚡ 템플릿 · 📎 이미지 첨부 · 💡 후속 제안 · 답변별 되돌리기. 메모 카드에는 ✨메모 다듬기 / ✎수정이 있습니다. (로컬 모델은 컨텍스트 8192 이상 필요 — 4096 에서는 실패합니다.)

## v2.7 — 라이브 캔버스
왼쪽 **라이브 캔버스** 메뉴의 채팅창에 말하면 LLM이 캔버스를 **읽고** 카드를 만들고 · 연결하고 · 수정하고 · 정렬하고 · 그룹으로 묶고 · (요청할 때만) 실행합니다.
- 예) "30초 광고 4샷 H3 프롬프트와 레퍼런스 이미지 프롬프트를 카드로 나열해줘", "프롬프트 1~4에 영상 생성 카드를 하나씩 연결해줘", "연결 흐름대로 정렬해줘", "같은 종류끼리 모아줘".
- 설정 → **라이브 캔버스 LLM**: 메인 LLM과 따로 고를 수 있습니다(로컬 GGUF · ComfyUI TextGenerate · OpenRouter · Connect Custom=Vertex 프록시/Ollama 등). 입력창은 Enter 전송, Shift/Ctrl+Enter 줄바꿈, ↶로 되돌리기.
- 그룹: 그룹 틀은 항상 카드 아래, 그룹을 움직이면 안의 카드가 함께, 카드 하나를 움직이면 그룹은 그대로.

## v2.6 — 새로 생긴 것
- **레퍼런스 이미지 순서**: 이미지를 여러 장 받는 포트 아래에 `@image1`, `@image2`… 칩(썸네일, ◀▶로 순서 변경)이 보입니다. 프롬프트에서는 이 번호로 지칭합니다.
- **프롬프트 작성 (원 스튜디오 방식)**: 프롬프트 카드에 ✨강화 · ✎수정(Refine) · ⚙옵션. 연결된 생성 카드의 모델(Z-Image/Flux/Krea2/SDXL/Anima/Qwen/LTX/H3)에 맞는 문체로 쓰고, 연결된 레퍼런스 이미지를 보고 `@imageN`으로 지칭합니다. 수정은 "무엇을 바꿀지" 입력 → 원본/수정본 비교 → 적용. 심플 모드도 동일.
- **에셋 라이브러리**: 왼쪽 **에셋 라이브러리** 메뉴에서 등록(업로드 · 끌어다 놓기 · 갤러리에서 선택) · 이름/카테고리/태그/메모 수정 · 파일 교체 · 삭제를 팝업으로. 카드에 선택한 에셋 썸네일이 보이고, 프롬프트 카드의 `@이름` 칩은 에셋 카드가 연결돼 있을 때만 나옵니다.
- **갤러리**: 이미지/영상 탭, 클릭=확대 · 더블클릭=캔버스 카드. **눈가리기**(👁): 항목별 블러, 헤더에서 한꺼번에 잠깐 보기. 에셋에도 같은 눈가리기(원 스튜디오 갤러리와 숨김 목록 공유). 캔버스·심플 어느 모드에서나 열립니다.
- **심플 모드**: 가운데 정렬 대화 화면 — 내 프롬프트는 오른쪽 말풍선, 결과는 왼쪽 말풍선. 결과 클릭 시 큰 화면. 파일이 삭제됐으면 "삭제됨"과 비활성 버튼, 로드 실패는 "다시 시도". 왼쪽 메뉴는 심플에서 캔버스 전용 항목(덱·노드)을 숨깁니다.
- **카드 색상**: 우클릭 → 카드 색상 → 맨 끝 무지개 칸 → 팝업에서 **배경색 / 글씨색**을 각각 고르고 저장·삭제(우클릭, 확인창).
- **LTX Director**: 오디오 트랙 · 모션(영상 가이드) 트랙 입력.
- **화면**: 미니맵 제거, 흰색 손 아이콘, 왼쪽 패널 너비 조절(경계 드래그, 더블클릭=기본), 다크 스크롤바, 전체 실행 버튼 보라색, 카드 디자인 정리, 앱 자체 확인/입력 창(내장 브라우저에서 기본 창이 막혀 '새로 만들기'가 안 되던 문제 해결).
- **고친 것**: Z-Image ControlNet·Face Redraw 그래프, LTX/H3 모델 자동 선택(영상·오디오 VAE, 음악용 텍스트 인코더를 잘못 고르던 것).
- 자세한 변경 내역은 `CHANGELOG.md`.

## v2.2 — 카드 덱 방식
기능은 **카드 한 장 = 기능 하나**로 나뉘어 있고 선으로 연결합니다. 모든 생성은 STUDIO_ONE / TJ_NODE 를 백엔드 API 로 사용합니다.
- 카드: LoRA, H3 Turbo·7+1, H3 Speed, H3 Audio Lock, Asset Library(@이름)
- 이미지: 생성·편집·인페인트·아웃페인트·페이스스왑·업스케일(ESRGAN/SeedVR2), Z-Image ControlNet·Face Redraw, Krea 2 ControlNet·Identity Edit, Anima Control/Inpaint, Qwen Camera Angle, H3 이미지, Character Sheet
- 영상: H3(텍스트/첫-끝/레퍼런스) · LTX · LTX Director · Video Edit(LTX) · Face Refine · Stitch · 오디오 넣기 · Scene/Beat Detect
- 음악: Ace-Step / MiniMax / YuE2(커버·멜로디), Music Writer(LLM)
- Postprocess: Deblur · Denoise · Upscale · Skin · Grain · Interpolate · Resize (각각 카드)
- 왼쪽 **Decks** 에서 스타터 덱을 펼치거나 내가 만든 연결을 덱으로 저장
- 선을 빈 곳에 놓으면 연결 가능한 카드 메뉴가 뜹니다 / 우클릭 메뉴 / 카드 선택 후 추가하면 자동 연결
자세한 진행 상황과 남은 작업은 `HANDOFF.md` 참고. (원본 패널 불러오기는 Settings 의 Legacy 옵션)

> 업데이트(git pull) 후에는 실행 중인 서버를 끄고 `start.bat`(또는 `start.sh`)을 다시 실행하세요. 시작할 때마다 git pull + 화면 빌드를 자동으로 합니다. (`dist/` 는 git 에 포함되지 않습니다.)

## 라이선스
GPL-3.0 (LICENSE, NOTICE.md 참고).
