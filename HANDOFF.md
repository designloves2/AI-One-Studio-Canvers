# HANDOFF — AI ONE Studio Canvers (v2.1, 카드 덱 방식)

이어서 작업하는 쪽은 이 문서만 읽으면 됩니다. (작업 중 계속 갱신됨)

## 방향 (가장 중요)
- freavy식 **카드(노드) 그래프 캔버스** + 기능은 전부 **STUDIO_ONE / TJ_NODE 를 백엔드 API 로** 호출.
- v2.0 의 "원본 패널 통째로 불러오기(src/host)"는 잘못된 방향 → 기본 OFF (Settings → Legacy `hostPanels`). 코드는 남겨둠.
- 한 카드 = 한 기능, 선으로 연결. 예) 프롬프트→이미지생성→결과보기→프롬프트→영상생성→결과보기 / 영상로드→업스케일→디블러→스티치→결과보기.
- 사용자: 비개발자 디자이너, 설명 짧게, 버그수정은 원인·계획 허락 후, 결과는 압축파일로 전달. 크레딧 $1 남으면 커밋/푸시+이 문서 갱신 후 중단.

## 완료 (`npm run build` 통과, mock e2e14 통과)
- 포트 `lora` 추가. 카드: LoRA(체인), H3 Turbo·7+1, H3 Speed&Attention, H3 Audio Lock, Asset Library(@토큰/TJ_H3Reference).
- Video Generate 는 기본만 + `cards`/`loras`/`assets` 입력으로 카드 연결.
- Postprocess 카드: Deblur, Denoise, Video Upscale(FlashVSR/RTX/모델+2nd pass), Skin Retouch, Film Grain, Interpolation, Resize.
- Face Refine(다인 체인, Pick faces), Character Sheet, Video Edit(LTX refine), Video Stitch.
- Load Image / Load Video / Load Audio, Result Viewer(통과 출력).
- 캔버스: 선을 빈 곳에 놓으면 호환 카드 메뉴, 선택 후 추가 시 자동 연결, 우클릭 메뉴, Decks 패널(스타터 9종+내 덱).
- 파일: src/backend/{post,faceRefine,charSheet,ltxRefine,assetlib}.ts, src/engine/{more,util}.ts, src/decks.ts, src/panels/DecksPanel.tsx, src/canvas/{Pickers,ContextMenu}.tsx.

## 미검증
- 신규 카드는 mock 으로만 검증. 실제 GPU 품질/노드 입력명은 실기 확인 필요(Face Refine, Character Sheet, FlashVSR/RTX 2-pass, TJ_H3Reference, /h3_facerefine/scan).
- 옛 e2e2~e2e13 회귀는 변경 후 재실행 전(파라미터명 변경: H3 고급옵션→카드, import→Load Image).

## 남은 작업 (우선순위)
1. e2e2~e2e13 회귀 재실행/수정.
2. H3 Image Generator 카드(T2I/Ref2I, 2-pass, Fizgig) — 원본 graph_builder_minimax.js buildImageGenGraph 참고.
3. LTX Director 카드(타임라인).
4. Music/이미지 모드 카드 세분화 점검.
5. Asset Library `@` 자동완성, 등록/프로젝트 편집.
6. Postprocess 미리보기, fps 자동 인식.
7. 카드 디자인 다듬기, README/ARCHITECTURE 카드 방식으로 갱신.
8. 릴리스: build:mcp → 커밋 → release/AI-One-Studio-Canvers_v2.x.zip.

## 개발 메모
- 노드 추가: registry def → runner(EXTRA_RUNNERS in engine/more.ts) → 필요 시 backend 빌더.
- 카드 데이터는 text asset JSON(kind: lora|turbo|speed|lock|assetlib). `h3Cards(c)`, `cardLoras(c)`.
- 설치 확인 `hasNode(cls)`. 테스트: mock(MOCK_PORT=8199 node mock/mock-comfy.mjs) + `COMFY_URL=http://127.0.0.1:8199 npx vite --port 5930`.
- STUDIO_ONE 은 GPL-3: 코드 복사 금지(API/노드 규격만). freavy(MIT)도 개념만 참고.
- 레퍼런스 clone: /home/user/ref/{freavy,ComfyUI-TJ_NODE_STUDIO_ONE,ComfyUI-TJ_NODE} (새 세션이면 재clone).
