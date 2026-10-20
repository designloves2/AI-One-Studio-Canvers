# HANDOFF — AI ONE Studio Canvers (v2.8.1, 카드 덱 방식)

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

## 실기 검증 (8188 실제 ComfyUI, 2026-10-20)
- 통과: LTX Director(+오디오·모션 트랙, 캔버스 UI 실행 포함), 후처리 7종(Deblur/Denoise/Grain/Resize/Skin/Interpolate/Upscale), Face Refine, Character Sheet, Video Edit(LTX refine), Video Stitch, Transition Bridge, Beat/Scene Detect, H3 Image, H3 Video Generate, Image Generate, Music Generate, Camera Angle, Krea2 Control/Identity, Anima LLLite, Z-Image ControlNet·Face Redraw(그래프 버그 수정 후 통과: ZImageFunControlnet 은 MODEL 만 출력), Asset Library + H3 레퍼런스 영상.
- 수정한 자동선택 버그: LTX(영상/오디오 VAE·업스케일러·텍스트인코더), H3 텍스트 인코더(음악용 인코더를 잘못 고르던 것).
- 추가 통과: fps 자동 인식(30fps 입력 → 30fps 출력, 60프레임), Krea2 canny, Anima anycontrol.
- 심플 모드 실기 통과: 이미지 생성(Z-Image), '참조로 사용', '캔버스로', 영상 LTX 2.5(참조 이미지 첫 프레임), 영상 H3 터보. 영어로 남아 있던 라벨 일부 한글화(i18n.cards.ts).
- 앱 내장 브라우저는 confirm()/prompt()/alert() 를 자동 거절한다 → src/ui/dialog.tsx (askConfirm/askText/notify + DialogHost)로 교체. 새 코드에서 네이티브 대화상자 사용 금지. '새로 만들기' 정상화.
- 갤러리: 썸네일 클릭 = 확대(Esc/바깥 클릭으로 닫기, 하단 '캔버스로'·다운로드), 더블클릭 = 캔버스 카드로 추가.
- 갤러리 눈가리기: 썸네일 우하단 👁 = 개별 가리기(블러), 헤더 👁/🙈 = 전체 잠깐 보기. 서버 목록 /tj_shared/sensitive_media(키 `<subfolder>/<filename>`)를 One Studio 갤러리와 공유(src/backend/sensitive.ts). 가린 항목은 클릭/더블클릭/드래그 불가.
- UI: 왼쪽 사이드 패널 가로 조절(경계 드래그, 더블클릭=340px, localStorage), 다크 스크롤바, 전체 실행 버튼 보라색(호버: 흰 배경+보라 글씨).
- 레퍼런스 이미지 순서: 다중 이미지 입력 포트 아래에 @image1, @image2… 칩(썸네일+◀▶ 순서 변경)을 표시(store.moveEdge). 프롬프트 카드 ✨강화·Prompt Enhancer 는 연결된(또는 이 프롬프트가 연결된 생성 카드의) 이미지를 한 장씩 비전 설명 → 텍스트 LLM 이 @imageN 토큰으로 프롬프트 작성(src/backend/refEnhance.ts). 실기 통과(2장).
- 프롬프트 작성(ONE STUDIO 방식): 서버 /tj_studio_one/llm/enhance 가 model_format(모델별 지침)·aesthetic·purpose·extra_instructions·refine_instruction 으로 시스템 프롬프트를 만든다. 앱은 연결된 생성 카드의 모델 계열로 형식을 자동 선택(src/backend/promptStyle.ts), 프롬프트 카드에 ✨강화 / ✎수정(Refine: 지시 입력 → 원본·수정본 비교 → 적용, src/ui/refine.tsx) / ⚙옵션(작성 대상·미감·추가 지시). 심플 모드 강화·수정도 동일. Prompt Enhancer 카드에도 Write for/Aesthetic 파라미터.
- 프롬프트 카드 @태그 칩: 에셋 라이브러리 카드가 연결돼 있을 때만 표시(연결을 끊으면 사라짐).
- 에셋 라이브러리: 카드에 선택한 에셋 썸네일 표시, 사이드 메뉴 '에셋 라이브러리' 패널(등록·이름/카테고리/태그/메모 수정·파일 교체·삭제, src/panels/LibraryPanel.tsx; 서버 /tj_node/reflib/*).
- 카드 색상: 우클릭 메뉴는 프리셋 + 마지막 '커스텀'(무지개) 칸 하나만 둔다. 클릭하면 팝업(src/ui/ColorPopup.tsx): 왼쪽=배경색, 오른쪽=글씨색 각각 팔레트·색상띠·HEX·'저장' 버튼·저장 색 목록(클릭=선택 / 우클릭=확인창 후 삭제). 적용하면 node.color + node.textColor(--fg/--muted 덮어씀)로 저장. localStorage canvers_custom_colors_v1 / canvers_custom_text_colors_v1.
- UI 규칙: 앱 확인창(dialog.tsx)은 z-index 3000 으로 모든 팝업 위. 왼쪽 레일 라벨은 공백에서 줄바꿈(에셋/라이브러리, Asset/Library), 레일 너비는 auto(min 62px)라 긴 단어에 맞춰 자동 확장.
- 에셋 관리: 타일 클릭=편집 팝업(큰 미리보기·이름/카테고리/태그/메모·파일 교체(업로드/갤러리)·삭제), '＋ 에셋 등록'=등록 팝업(업로드/끌어다 놓기/갤러리에서 선택 + 이름·카테고리) (src/panels/AssetDialog.tsx). 에셋 눈가리기: 라이브러리 타일·편집 팝업·에셋 카드 썸네일·선택창에서 👁(우하단)로 가리기, 키 reflib/<id> 를 갤러리와 같은 숨김 목록에 저장.
- 갤러리: 이미지/영상 탭(영상은 /tj_shared/output_gallery_video, VHS 의 x.mp4 / x-audio.mp4 중 소리 있는 쪽만 표시), 심플·캔버스 모드 모두에서 열림. 심플 모드 왼쪽 메뉴에서는 캔버스 전용(덱·노드) 숨김. 결과 파일이 서버에서 사라지면 깨진 그림 대신 '파일을 찾을 수 없어요' 표시(AssetView).
- 심플 모드: 결과 파일이 삭제돼 있으면 '삭제됨' 표시 + 다운로드/참조로 사용/캔버스로 비활성화(삭제된 이미지 복구는 하지 않음). 영상 결과의 '캔버스로'는 Load Video 카드로 전달.
- 심플 모드 화면: 가운데 정렬 대화 영역(최대 860px, 입력창도 같은 폭). 내 프롬프트는 오른쪽 말풍선(보라), 결과(엔진명·진행률·이미지/영상·버튼)는 왼쪽 말풍선.
- 심플 모드 결과(이미지·영상) 클릭 → 큰 화면 뷰어(src/ui/Lightbox.tsx; 영상은 컨트롤+자동재생, Esc/바깥 클릭으로 닫기, 다운로드).
- 파일 로드: AssetView 는 서버가 404 일 때만 '삭제됨', 그 외 실패는 '불러오지 못했어요 · 다시 시도'. (2026-10-20 ComfyUI /view 가 응답을 안 줘서 영상·이미지가 안 뜬 적 있음 → Manager reboot API 로 재시작해 해결. 재시작 방법은 사용자 규칙: POST /api/manager/reboot, 사용자 OK 후, 프로세스 강제 종료 금지.)
- 라이브 캔버스(src/backend/liveCanvas.ts, src/panels/LivePanel.tsx): LLM 이 {say,cards,links,set,remove} JSON 을 돌려주면 applyPlan 이 새 카드를 기존 카드 아래 빈 공간에 row/col 격자로 배치. 카드 카탈로그는 REGISTRY 에서 자동 생성. 실기 통과(OpenRouter gemini-2.5-flash, 4샷+레퍼런스 2장). 주의: 2026-10-20 ComfyUI 재시작 후 'comfy'·'local' LLM 백엔드가 서버 500(PromptServer has no attribute last_prompt_id)을 냄 → 서버(TJ_STUDIO_ONE) 쪽 확인 필요. 라이브 캔버스는 설정 '라이브 캔버스 LLM'(settings.live: same / llm)으로 메인과 다른 LLM 선택 가능(runLlm 의 req.llm 오버라이드). 명령 전체: cards(near/place·row/col)·links·unlink·set·duplicate·remove·move·arrange(flow/grid/row/column/group-by-type)·align·distribute·group/ungroup·clear_results·select·run/stop·fit. 상태 전달은 canvasState(), 배치는 findFree(겹침 회피)·flowLayout(행 기준)·readingKey(샷 번호 순서). 실기 통과: '프롬프트 1~4에 영상 생성 카드 연결', '흐름대로 정렬', '색+가로 정렬+그룹' 복합 명령. 이후 개선 거리: 생성 카드까지 자동 연결, 카드 수정 요청, 스트리밍.
- 그룹 규칙(src/store/graph.ts group/fitGroup/reassignMembership, Flow.tsx): 틀은 zIndex -10 + elevateNodesOnSelect=false 로 항상 카드 아래, 틀 크기는 DOM 실측(measure). 그룹 이동=멤버 동반, 카드 단독 이동=그룹 고정, 드롭 시 틀 밖→소속 해제 / 틀 안→소속, 한 카드 한 그룹. 실기 확인(마우스 드래그).
- LLM 백엔드 5종 모두 라이브 캔버스로 시험 통과(2026-10-20). ComfyUI 재시작 직후 'comfy'/'local' 백엔드의 last_prompt_id 오류는 앱이 더미 작업으로 자동 우회(llm.ts warmUpServer). 생각(reasoning) 모델은 max_tokens 를 넉넉히(Test=400).
- 제작 모드(2.8.0): src/decks.production.ts(제작 덱 7종), src/backend/liveCombos.ts(조합 예시표), liveCanvas.ts(catalog(full|compact)·need_details·decks 명령·연결 누락 재요청·실행 확인), LivePanel(템플릿·첨부·제안·답변 되돌리기), NoteTools(메모 다듬기/수정). 실기: 광고 덱 15장 채움, 이미지 체인·후처리 체인·터보 옵션 카드 연결 모두 통과(OpenRouter).
- 라이브 캔버스 로컬 LLM: n_ctx 8192 이상 필요(4096 은 JSON 실패). 미검증으로 남은 것: '연결 누락 시 재요청' 보정(코드만).
- 알려진 제한: 소리 트랙이 없는 mp4 는 VHS 로더가 실패한다(후처리/Face Refine/Video Edit). 안내 문구만 추가함(comfy.ts friendlyError). 자동 무음 삽입은 미구현.
- 미검증: Face Refine 다인 체인, Anima inpaint 모드.
- 테스트 팁: vite HMR 후에는 모듈 URL 에 ?t= 가 붙어 콘솔 import 가 다른 인스턴스가 된다 → performance 리소스 목록의 정확한 URL 로 import.
- UI: 캔버스 미니맵 제거, 손 도구 아이콘을 흰색 SVG 로 교체.

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
