# HANDOFF — AI ONE Studio Canvers (v2.1, 카드 덱 방식)

이어서 작업하는 쪽은 이 문서만 읽으면 됩니다. (작업 중 계속 갱신됨)

## 방향 (가장 중요)
- freavy식 **카드(노드) 그래프 캔버스** + 기능은 전부 **STUDIO_ONE / TJ_NODE 를 백엔드 API 로** 호출.
- v2.0 의 "원본 패널 통째로 불러오기(src/host)"는 잘못된 방향 → 기본 OFF (Settings → Legacy `hostPanels`). 코드는 남겨둠.
- 한 카드 = 한 기능, 선으로 연결. 예) 프롬프트→이미지생성→결과보기→프롬프트→영상생성→결과보기 / 영상로드→업스케일→디블러→스티치→결과보기.
- 사용자: 비개발자 디자이너. 중간 보고 없이 끝까지 진행. 커밋은 사용자 지시 후, 릴리스 전 `npm run build:mcp` 매번. 테스트는 mock 없이 8188 실제 ComfyUI.

## 완료 (`npm run build` 통과, mock e2e14 통과)
- 포트 `lora` 추가. 카드: LoRA(체인), H3 Turbo·7+1, H3 Speed&Attention, H3 Audio Lock, Asset Library(@토큰/TJ_H3Reference).
- Video Generate 는 기본만 + `cards`/`loras`/`assets` 입력으로 카드 연결.
- Postprocess 카드: Deblur, Denoise, Video Upscale(FlashVSR/RTX/모델+2nd pass), Skin Retouch, Film Grain, Interpolation, Resize.
- Face Refine(다인 체인, Pick faces), Character Sheet, Video Edit(LTX refine), Video Stitch.
- Load Image / Load Video / Load Audio, Result Viewer(통과 출력).
- 캔버스: 선을 빈 곳에 놓으면 호환 카드 메뉴, 선택 후 추가 시 자동 연결, 우클릭 메뉴, Decks 패널(스타터 9종+내 덱).
- 파일: src/backend/{post,faceRefine,charSheet,ltxRefine,assetlib}.ts, src/engine/{more,util}.ts, src/decks.ts, src/panels/DecksPanel.tsx, src/canvas/{Pickers,ContextMenu}.tsx.

- 실행 중 카드에 반투명 오버레이 + RUNNING… 표시(프롬프트 강화 포함).

- 연결선: 우클릭 '연결 끊기', 클릭 선택+Delete, 선 끝을 빈 곳에 놓으면 삭제, 카드 우클릭 '카드 색상'.
- 심플 모드: 영상 생성(H3 / H3 레퍼런스 / LTX 2.5) 추가, H3 터보·7+1 옵션 포함.

- 캔버스 조작: 왼쪽 드래그 = 이동, Ctrl(⌘)+왼쪽 드래그 = 영역 선택.

## 미검증
- 신규 카드는 mock 으로만 검증. 실제 GPU 품질/노드 입력명은 실기 확인 필요(Face Refine, Character Sheet, FlashVSR/RTX 2-pass, TJ_H3Reference, /h3_facerefine/scan).
- 옛 e2e2~e2e13 회귀: 재실행 완료, 모두 통과(e2e5 는 'Import'→'이미지 불러오기' 이름 변경에 맞춰 테스트 locator 수정). 신규 e2e14(카드/덱/후처리/Asset/FaceRefine/CharSheet) 통과.
- 한국어 번역: src/i18n.cards.ts (새 카드 라벨).

## 남은 작업 (우선순위)
1. (완료) 회귀 재실행.
2. (완료) H3 Image Generator 카드 `h3-image` — src/backend/h3Image.ts, mock 통과. 실기 미검증.
3. (완료·간이) LTX Director 카드 `ltx-director`: 구간별 프롬프트(beats: `0-3: 문장`) + 이미지 시간 고정. 오디오/모션 트랙은 아래 섹션 참고. (원본 director UI 는 GPL, 열람·복사 금지 — W1 규칙)
4. (진행) 이미지 모드 점검: Z-Image ControlNet / Face Redraw 카드 추가 완료(mock 통과). Camera Angle(Qwen) 카드도 추가. Krea2 depth/canny 컨트롤 카드도 추가(mock 통과). Krea2 Identity Edit·Anima LLLite(any/depth/inpaint) 카드도 추가(mock 통과). Image Upscale 카드에 SeedVR2 엔진 추가. 이미지 쪽 STUDIO_ONE 모드는 대부분 카드화됨. 남음: 음악: Music Writer(LLM) 카드 추가(가사·스타일 캡션·커버 프롬프트·제목, /music_one/llm/prompts 사용). 남음: 음악 생성 모드별(Ace-Step/MiniMax/YuE2) 카드 분리 여부 판단. 원본 workflows/*.json 참고.
5. (완료) `@` 칩·자동완성, 에셋 선택창에서 프로젝트 저장/삭제.
6. (일부 완료) 후처리 카드 '원본 프레임레이트' 고급 옵션 추가, 프롬프트 입력 중 `@` 자동완성 완료. 후처리 카드 '처음 N프레임만 테스트' 옵션 추가. fps 자동 인식(브라우저에서 프레임 간격 측정, 기본 0=자동, 실패 시 24) 추가. 실제 mp4 로 정확도 검증은 안 됨.
7. 카드 디자인 다듬기, README/ARCHITECTURE 카드 방식으로 갱신.
8. 릴리스: build:mcp → 커밋 → release/AI-One-Studio-Canvers_v2.x.zip.

## 라이선스 결정 (중요)
- 사용자 결정: 아직 라이선스를 정하지 않았으므로 **GPL-3.0-only 채택** (LICENSE, NOTICE.md, package.json `license`). STUDIO_ONE/LTX Director 가 GPL-3.0 이라 그 코드를 읽고 포팅해도 된다(고지 유지).
- freavy(MIT)는 개념만 참고, 코드 복사 안 함(ContextMenu 등은 직접 작성).

## LTX Director 오디오·모션 트랙 (구현 완료, mock 미실행·실기 미검증)
- `ltx-director` 카드에 `audio`/`video(모션 가이드)` 선택 입력 + 시작초/모션 강도 파라미터. `LtxJob.timeline.audio/motion` → `audioSegments`/`motionSegments`(프레임 단위, audioFile/videoFile) + `use_custom_audio/motion`.
- 원본 참고: Comfy-Dasktop/ComfyUI/custom_nodes/WhatDreamsCost-ComfyUI/{ltx_director.py,js/ltx_director.js}. 실기에서 소리 반영·모션 가이드 확인 필요.
- 음악 생성은 카드 하나(Music Generate)로 유지 결정(모드 분리 안 함).

## ITDA(타임라인 편집기) 상태
- Video Stitch / Add Audio to Video(오디오 교체) 카드로 핵심 일부 대체. Scene Detect / Beat Detect 카드 추가(src/backend/itda.ts, mock 통과). Transition Bridge(클립 사이 전환) 카드 추가. 미구현: 3레인 타임라인 편집 UI, ffmpeg export.

## 개발 메모
- 노드 추가: registry def → runner(EXTRA_RUNNERS in engine/more.ts) → 필요 시 backend 빌더.
- 카드 데이터는 text asset JSON(kind: lora|turbo|speed|lock|assetlib). `h3Cards(c)`, `cardLoras(c)`.
- 설치 확인 `hasNode(cls)`. 테스트: mock(MOCK_PORT=8199 node mock/mock-comfy.mjs) + `COMFY_URL=http://127.0.0.1:8199 npx vite --port 5930`.
- STUDIO_ONE 은 GPL-3: 코드 복사 금지(API/노드 규격만). freavy(MIT)도 개념만 참고.
- 레퍼런스 clone: /home/user/ref/{freavy,ComfyUI-TJ_NODE_STUDIO_ONE,ComfyUI-TJ_NODE} (새 세션이면 재clone).
