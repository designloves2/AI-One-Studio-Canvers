# AI ONE Studio Canvers

노드 캔버스로 이미지를 만드는 웹 화면(프론트엔드)입니다.
**생성·LLM 같은 실제 작업은 전부 [ComfyUI-TJ_NODE_STUDIO_ONE](https://github.com/designloves2/ComfyUI-TJ_NODE_STUDIO_ONE) 가 설치된 ComfyUI(백엔드 API)** 가 처리하고,
LLM 4가지 방식은 [ComfyUI-TJ_NODE](https://github.com/designloves2/ComfyUI-TJ_NODE) 의 `LLM (TJ)` 노드와 동일합니다.

> 캔버스 구조는 [freavy](https://github.com/FrameDeptCo/freavy)(MIT)의 개념을 분석해 **코드 복사 없이 새로 구현**했습니다.

## 실행 방법 (3단계)

1. ComfyUI에 `ComfyUI-TJ_NODE_STUDIO_ONE`, `ComfyUI-TJ_NODE` 를 설치하고 ComfyUI를 켭니다 (기본 주소 `127.0.0.1:8188`).
2. 이 폴더에서 **`start.bat`** (Windows) 또는 `./start.sh` (Mac/Linux) 를 실행합니다.
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

## 지원 현황 (v0.1)

| 구분 | 상태 |
|---|---|
| 이미지 생성/편집/인페인트/아웃페인트: Z-Image Turbo, Flux.2 Klein, Krea 2, SDXL | ✅ |
| 얼굴 교체(Klein), 배경 제거, 업스케일(ESRGAN 계열) | ✅ |
| 브라우저 편집 노드 20종 (자르기·블러·레벨·블렌드·마스크 등), 페인터(마스크 그리기) | ✅ |
| LLM 노드 3종 + 4가지 백엔드 | ✅ |
| 그룹, 잠금, 실행취소/다시실행, 비교, 메모, 갤러리 | ✅ |
| 비디오(MiniMax H3 · LTX 2.5), Qwen 2511/2.1 · Anima, 음악(MusicMaker), MCP 서버 | 🔜 다음 단계 |

자세한 구조·백엔드 API 목록은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 개발

```
npm install
npm run dev        # http://localhost:5917 (ComfyUI는 COMFY_URL 로 프록시)
npm run typecheck
npm run build && npm start
npm run mock       # GPU 없이 UI 시험용 가짜 ComfyUI (:8188)
```
