# Director Mode — 기존 코드 감사 (Phase 0)

작성일 2026-10-29. 기준 버전 v2.27.4. 명세: `AI_ONE_Studio_Canvers_Director_Mode.md`.
구분: **[확인]** 코드·문서에서 직접 읽음 / **[추정]** 읽은 것에서 유추 / **[미확인]** 아직 안 봄 또는 실행 못 함.

## 0. 결정된 구성
- 앱 모드는 **Director / Canvas / Simple** 3개 (사용자 지시, 2026-10-29). 상단 모드 토글에 3버튼.
- 세 모드는 같은 `project_id`·같은 저장소를 공유한다. 별도 앱·별도 백엔드·두 번째 그래프 엔진은 만들지 않는다.

## 1. 모드 전환 구조
- [확인] `src/store/graph.ts`: `type AppMode = 'canvas' | 'simple'`, `setMode`, 선택값은 `localStorage['canvers.mode']`(읽을 때 `'simple'`이 아니면 canvas).
- [확인] `src/App.tsx` `TopBar`의 `.mode-toggle`이 Canvas/Simple 2버튼. `App`은 `mode === 'canvas'`면 `<Flow/>`+`Toolbar`+`SelectionBar`, 아니면 `<SimpleView/>`.
- [확인] 단축키 핸들러는 `g.mode !== 'canvas'`면 캔버스 단축키를 무시. Rail은 simple일 때 `decks/nodes/live/canvases`를 숨김.
- 영향: `AppMode`에 `'director'` 추가, `readMode` 수정, TopBar 버튼 1개, `App` 분기 1개, Rail 항목 가시성 규칙 추가가 필요. 기존 Canvas/Simple 동작은 바꾸지 않는다.

## 2. 저장/불러오기
- [확인] 캔버스 = `Project { id, name, nodes, edges, updatedAt, app:'ai-one-studio-canvers', version:1 }` (`src/types.ts`).
- [확인] 저장 위치: 서버 `server-lib/canvases.mjs`, 폴더 `canvases/`(또는 `CANVERS_DIR`), 파일 `<이름>.json`. 라우트 `GET /canvers/canvases`, `GET|PUT|DELETE /canvers/canvases/<name>`. PUT은 `nodes`·`edges`가 배열인지만 검사, 임시파일 쓰고 `rename`(반쯤 쓰인 파일 방지). 이름 규칙: `\ / : * ? " < > |` 금지, 점으로 시작 금지, 100자 이하. 본문 최대 200MB.
- [확인] 내보내기/가져오기: `exportProjectFile`(`<이름>.canvers.json` 다운로드), `importProjectFile`(`nodes`·`edges` 배열 검사 후 `loadProject`).
- [확인] 자동 저장: `localStorage['canvers.autosave.v1']`(600ms 디바운스), 새 탭이면 복원 여부를 묻는다. 실행 중 작업은 `resumeInflight`로 복구.
- [확인] `Project`에는 스키마 마이그레이션이 없다(`version:1` 고정, 읽을 때 검사 안 함).
- [확인] 서버는 `PUT` 본문의 다른 필드를 그대로 저장한다(`nodes`·`edges`만 검사). → Director 데이터를 별도 파일로 두면 기존 캔버스 목록 `list()`에 섞인다. 목록은 `canvases/*.json` 전부를 캔버스로 취급하므로 **같은 폴더에 Director 파일을 두면 안 된다**.
- [미확인] 프로젝트 폴더/백업 정책: 코드에 백업·버전 보관 로직 없음(확인함). 문서상 정책 없음.

## 3. 그래프 / 레지스트리 / 실행
- [확인] `src/registry/index.ts`: `NodeDef`(포트·파라미터·엔진), `REGISTRY`, `byId`, `compatible(a,b)`(포트 타입 호환), `defaultParams`, `engineFor`.
- [확인] `GraphNode { id, defId, x, y, params, engineId, results, activeResult, … }`, `GraphEdge { id, source, sourceHandle, target, targetHandle }`. 노드 id는 `uid()`(`backend/comfy.ts`).
- [확인] `store.addNode(defId,x,y,init)`, `connect(edge)`(불가하면 false). 그래프 순환은 `upstream()`이 'The graph has a loop'로 막는다.
- [확인] 실행: `engine/run.ts executeGraph(g, targetId, hooks, signal)`가 앞단부터 순서대로 실행. 한 카드 실행 `engine/actions.ts runNode(id)`, 전체 `runAll`. 카드별 러너는 `engine/more.ts EXTRA_RUNNERS`.
- [확인] 카드 중 이미 `ltx-director`(LTX Director 타임라인, `beats`·`image_times` 등)가 있다. 러너 `engine/more.ts`, 빌더 `backend/ltx.ts`, 노드 `LTXDirectorTJ25`.
- [추정] Director→Canvas 어댑터는 `registry`의 `byId`로 카드 존재를 확인하고 `addNode`/`connect` 규칙(`compatible`)을 그대로 써서 노드·엣지 배열을 만들면 된다. `store`를 거치지 않고 순수 함수로 `Project`를 만들 수 있다.

## 4. LTX Director와의 이름 충돌
- [확인] 문서·코드에서 "LTX Director"는 비디오 카드 이름(`ltx-director`). 앱 모드 이름 "Director"와 다르다.
- 결정: 모드 이름은 **Director**, 카드는 기존대로 **LTX Director (timeline)**. 화면 문구·i18n 키에서 모드 이름은 `Director`, 카드 이름은 건드리지 않는다. 모드 전용 id·접두사는 `director-` / `director_mode`.
- [확인] `i18n.cards.ts`에 한글 사전이 있다(영어 원문 키, 중복 금지). 새 문구는 영어로 쓰고 사전에 추가.

## 5. LLM
- [확인] `store/settings.ts`: `llm`(Brief), `vision`, `live`(Live Canvas) 3계통, 백엔드 `local | comfy | openrouter | custom`. OpenRouter는 기본 모델 없음(비면 안내).
- [확인] `backend/llm.ts runLlm({system, prompt, ...})`, `loadServerSettings`, MCP `canvers_llm`이 같은 함수를 쓴다.
- 영향: Director 기획(브리프→스토리→씬/샷)은 새 설정 없이 `runLlm`을 재사용. 결과는 항상 "초안"으로 받고 승인된 내용을 덮어쓰지 않는다(명세).

## 6. 에셋
- [확인] 두 종류가 있다. (a) 갤러리/결과 `Asset { id, type, url, file?: FileRef{filename,subfolder,type}, text?, port?, meta? }` — ComfyUI input/output/temp 파일 참조. (b) 에셋 라이브러리 `backend/assetlib.ts` `LibAsset { id:number, kind, name, category, … }` — 서버 `/tj_node/reflib/*`, `@이름`/`@번호`로 프롬프트에서 참조, 이름은 영문/숫자/`_`/한글만.
- [확인] 라이브러리는 서버 소유(숫자 id). 파일은 서버 쪽에서 이동되기도 한다(이름·카테고리 변경 시).
- 영향: Director의 `asset_id`는 자체 안정 id로 두고 `source_ref`에 `{kind:'library', id}` 또는 `{kind:'file', FileRef}`를 보관한다. 라이브러리가 없는 PC(`mentionNames`가 빈 배열)에서도 동작해야 한다.

## 7. MCP
- [확인] `mcp/server.ts` → `npm run build:mcp` → `mcp/server.mjs`. 도구: `canvers_status`, `canvers_list_nodes`, `canvers_generate`, `canvers_llm`, `canvers_build_canvas`, `canvers_run_canvas`. `serverInfo.version`은 `package.json`과 함께 올린다.
- [확인] `canvers_build_canvas`가 이미 "프롬프트 → image-generate 쌍" `.canvers.json`을 쓴다. Director 어댑터와 같은 출력 형식.
- [미확인] 이번 작업에서 MCP에 Director 도구를 추가할지는 Phase 5 이후 판단(명세상 선택).

## 8. 테스트·검증
- [확인] 자동 테스트 스위트 없음. 검사 명령: `npm run typecheck`, `npm run build`, `npm run build:mcp`. `mock/mock-comfy.mjs`(가짜 ComfyUI)가 있으나 `docs/HANDOFF.md`는 실제 8188 사용을 방침으로 적음.
- 방침: 순수 함수(마이그레이션·어댑터·ZIP 구성)는 Node 스크립트로 fixture 검증, 화면은 다른 포트(8766)에서 확인, 실제 생성은 사용자가 서버가 비었다고 하기 전에는 돌리지 않는다(GPU 16GB 공유). 못 한 것은 "미검증"으로 기록.

## 9. 의존성/라이선스
- [확인] 의존성 `@xyflow/react, react, react-dom, zustand`뿐. ZIP 생성용 라이브러리 없음 → Phase 5에서 (a) 무의존 STORE(무압축) ZIP 직접 작성 또는 (b) 의존성 추가 중 선택(구현 계획 참조). 라이선스 GPL-3.0-only 유지.

## 10. 작업 트리 상태 (작업 시작 시점)
- 다른 세션의 미커밋 변경이 있다: `CHANGELOG.md`, `CLAUDE.md`, `README.md` 수정, `HANDOFF.md → docs/HANDOFF.md` 이동. **이 작업에서 건드리지 않았고 건드리지 않는다.** (CHANGELOG/CLAUDE.md 갱신은 커밋 지시가 올 때 그 변경과 합쳐서 한다.)
- 최근 커밋 `4b93b3e`가 명세서 파일을 추가했다.

## 11. 미확인 목록
- 실제 ComfyUI 생성·복구 동작(이번 감사는 코드 읽기만).
- `Flow.tsx`·`CanvasNode.tsx`의 노드 크기·배치 규칙(어댑터의 좌표 배치에 쓸 값은 Phase 3에서 확인).
- `SimpleView`가 모드 상태를 어디까지 참조하는지(Simple 모드는 건드리지 않는 것이 목표).
