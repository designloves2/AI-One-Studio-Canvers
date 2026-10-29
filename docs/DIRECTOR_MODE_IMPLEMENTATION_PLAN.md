# Director Mode — 구현 계획

기준: `AI_ONE_Studio_Canvers_Director_Mode.md` v2.0, 감사 문서(`DIRECTOR_MODE_EXISTING_CODE_AUDIT.md`), 데이터 계약(`DIRECTOR_MODE_DATA_CONTRACT.md`).
모드는 **Director / Canvas / Simple**. 각 단계 끝에 `npm run typecheck`, 필요 시 `npm run build`, 릴리즈 전 `npm run build:mcp`. 커밋·푸시는 사용자가 지시할 때만.

## Phase 1 — 데이터 모델과 저장 (UI 없음)
- `src/director/types.ts`(계약의 타입), `src/director/ids.ts`, `src/director/migrate.ts`(schema_version 체인), `src/director/validate.ts`.
- `server-lib/director.mjs`(+ `serve.mjs`, `vite.config.ts` 연결), `src/backend/director.ts`(list/load/save/delete, `canvases.ts`와 같은 모양).
- 검증: Node 스크립트로 fixture(정상·구버전·미래 버전·깨진 JSON·위험한 이름) 통과. 기존 canvases 라우트 회귀(목록에 Director 파일 안 섞임) 확인.

## Phase 2 — Director UI MVP
- `AppMode`에 `'director'` 추가(`store/graph.ts` readMode 포함), `App.tsx` TopBar 3버튼과 `<DirectorView/>` 분기, 단축키·Rail 가시성 규칙.
- `src/director/` 화면: 프로젝트 목록, 브리프, 스토리/기획(초안/승인), 씬·샷 보드, 에셋 연결(라이브러리 선택은 `assetlib` 재사용). 문구는 영어 + `i18n.cards.ts` 한글 사전.
- 새 상태는 `store/director.ts`(zustand). Canvas/Simple 코드 경로는 수정하지 않는다.

## Phase 3 — Canvas 어댑터
- `src/director/adapter.ts` 순수 함수(데이터 계약 §5). `report.missing`, 멱등, 위치 보존.
- UI: 샷 보드 "Canvers 캔버스 만들기" → `canvases/`에 저장하고 Canvas 모드로 전환하지 않고 링크만 표시(열기 버튼 별도).
- 검증: Node 스크립트로 어댑터 출력이 `Project` 형식·`compatible()` 규칙을 지키는지, 두 번 실행해도 노드가 늘지 않는지.

## Phase 4 — 실행·결과 연결
- 실행 모드 4종(기본 manual). 승인 필요 모드는 `askConfirm`(`ui/dialog.tsx`).
- 캔버스 결과 → 샷 `results[]` 동기화, 상태 전이(`queued→generating→review→done/failed`).
- 실제 생성은 사용자가 서버가 비었다고 할 때만 시험. 그 전에는 mock/코드 검토까지만 하고 "미검증"으로 기록.

## Phase 5 — LLM 기획과 ZIP
- 기획: `runLlm` 재사용(새 설정 없음), 결과는 `draft_*`에만. 로컬 GGUF 5분 초과·OpenRouter 모델 비었을 때는 기존 안내 문구 사용.
- ZIP: 의존성 없이 무압축(STORE) ZIP 작성기를 `src/director/zip.ts`에 직접 구현(CRC32), 경로 검증·비밀 제외 테스트 포함. 의존성 추가는 하지 않는다(결정 이유: 현재 의존성이 4개뿐, 라이선스 점검 부담 회피).

## Phase 6 — 마무리
- MCP에 읽기 전용 도구(프로젝트 목록/내보내기) 추가 여부 판단. `serverInfo.version` 동기.
- `docs/ARCHITECTURE.md`, `docs/HANDOFF.md`, `CLAUDE.md` §3·§8, `CHANGELOG.md` 갱신, 모바일 레이아웃 확인.

## 위험과 대응
| 위험 | 대응 |
|---|---|
| 다른 세션의 미커밋 변경(CHANGELOG/CLAUDE.md/README/docs 이동)과 충돌 | 새 파일 위주로 작업, 그 3개 파일은 커밋 지시가 올 때 마지막에 한 번만 수정 |
| Director 파일이 캔버스 목록에 섞임 | 별도 폴더·라우트(위 Phase 1) |
| 기존 `.canvers.json` 호환 깨짐 | 어댑터 출력은 `Project v1` 그대로, 기존 필드 삭제·개명 금지 |
| 승인된 내용이 AI 재생성으로 덮임 | `draft_*` 분리, 승인본 쓰기 금지 |
| 노드 저장소 변경 필요 | 없음(명세상 수정 금지). 필요해지면 중단하고 보고 |

## 진행 상태
- Phase 0: 문서 3개 작성 완료. 코드 변경 없음.
- Phase 1: 완료(커밋 4ecc8a6). `src/director/{types,model}.ts`, `server-lib/director.mjs`(+`serve.mjs`·`vite.config.ts` 연결), `src/backend/director.ts`, `scripts/test-director.mjs`(`npm run test:director`, 30개 통과), `npm run typecheck` 통과. 화면 없음. 실제 앱 서버(8765/8766)에서의 라우트 확인은 아직 안 함(임시 서버로만 시험).
- Phase 2: 완료(커밋 d4be79b). 모드 3개(Director/Canvas/Simple) 토글, `src/director/DirectorView.tsx`(브리프·스토리 초안/승인·씬/샷 보드·에셋 연결), `src/store/director.ts`, 한글 사전, CSS(모바일 폭 규칙 포함). `npm run typecheck`·`npm run build`·`npm run test:director` 통과. 브라우저(포트 8766)에서 확인: 3모드 전환, 새 프로젝트→씬/샷 추가→프롬프트 입력→저장→디스크 파일 확인→새로고침 뒤 모드 유지·다시 열기, Canvas/Simple 정상, 콘솔 오류 없음. 못 한 것: 에셋 라이브러리 실제 목록(서버 8188 연결 안 보고 시험), 넓은 데스크톱 폭 눈으로 확인(시험 창이 좁아 모바일 배치만 봄), 승인 상태 버전 이력("버전 기본 기능")은 아직 없음.
- Phase 3: 완료(커밋 e37777b). `src/director/adapter.ts`(순수 어댑터), `adapterRegistry.ts`(실제 레지스트리 연결), `canvasAction.ts`, 샷 보드의 "Canvers 캔버스 만들기/갱신"·"캔버스에서 열기". 샷 1개 = Prompt 카드 + (Image Generate | Video Generate) 카드 + 선 1개, 카드 id 고정(`n_<shot_id>_text|gen`)이라 다시 만들어도 중복 없음. 캔버스에서 옮기거나 바꾼 위치·파라미터·결과는 유지, 사용자가 캔버스에서 고친 프롬프트는 유지하고 보고, 지운 카드는 다시 만듦, Director에서 빠진 샷의 카드는 지우지 않고 보고, 레지스트리에 없는 카드는 대체하지 않고 건너뜀. 검증: `npm run test:director`(어댑터 30개 포함, 실제 레지스트리 사용), typecheck, 브라우저(8766)에서 만들기→캔버스에서 열기(카드 4개·선 2개·16:9)→다시 눌러 "바꿀 것이 없습니다" 확인. 못 한 것: **에셋 카드 연결**(에셋이 있는 샷은 보고만 하고 카드에는 안 붙임 — 에셋 라이브러리 카드 계약을 아직 확인하지 않음), 한 샷에 이미지+비디오 동시 생성 템플릿(생성 카드 종류는 한 번에 하나 선택), 실제 생성 실행(안 돌림). `CanvasLink.prompt_sent`(선택 필드) 추가.
- Phase 4: 완료(미커밋). `src/director/execution.ts`(순수: 실행 모드 계획·결과 가져오기), `canvasAction.ts`의 `syncResultsFromCanvas`/`runFromDirector`, 샷 보드의 실행 모드 선택·"결과 가져오기"·샷별 ▶실행·결과 썸네일(선택 표시), `scripts/test-director-execution.mjs`(33개).
  - 실행 모드: `manual`(기본, 이 화면에서 아무것도 시작 안 함) / `approval_required`(승인된 샷마다 실행 버튼, 매번 확인) / `step_by_step`("다음 샷 실행", 한 번에 한 샷, 매번 확인) / `hybrid`("승인된 샷 모두 실행" 한 번 확인 후 차례로, 첫 실패에서 멈춤 + 샷별 실행). 승인(approved)된 샷만 실행. 버튼을 누르고 확인에 "예"라고 해야만 시작.
  - 안전장치: 캔버스를 만든 뒤 프롬프트가 바뀐 샷은 실행 차단("캔버스 갱신" 먼저), 이미 실행 중인 카드는 차단, 실패·취소 시 나머지 샷은 시작하지 않고 approved로 되돌림, 결과는 추가만 하고 지우지 않음(캔버스에서 사라져도 샷 기록에 남음), 끝난 샷(done)은 카드 오류로 되돌리지 않음.
  - 실행 후 자동 저장: 캔버스 파일과 Director 프로젝트(실행으로 바뀐 것). 이 두 가지만 자동 저장하며 실행 전에는 어떤 것도 저장하지 않음.
  - 확인한 것: 순수 로직 33개, typecheck, 브라우저(8766): 수동 모드에서 실행 버튼 없음, 혼합 모드에서 버튼 표시·확인창에 샷 목록과 개수·"취소" 시 상태 불변·ComfyUI 큐 0/0, 프롬프트 수정 뒤 실행 차단 → 캔버스 갱신 뒤 다시 허용, 결과 가져오기(가짜 결과 파일을 캔버스에 넣어 시험): 결과 1개 추가·자동 선택·approved→review·두 번째는 변화 없음.
  - **못 한 것(미검증)**: 실제 ComfyUI 생성 실행(`runNode`를 통한 한 샷 렌더, 실패/취소 경로의 실제 상태, 실행 직후 자동 저장). GPU 공유라 사용자가 서버가 비었다고 하기 전에는 돌리지 않음. 결과 선택(picked)을 다음 단계(ZIP·내보내기)에서 쓰는 부분은 아직 없음.
- Phase 5 이후: 시작 전.

## v2.1 재설계 (제작자가 말로 지시, 작업팀이 수행) — 진행 상태 (2026-10-29, 미커밋)
Phase 2~4에서 만든 "양식 편집기" 화면은 요구와 달라 **채팅 중심 구조로 교체**했다. 저장 서버·캔버스 어댑터·실행 모드·결과 연결은 그대로 재사용한다.
- 사용자 모델: 사용자는 제작자, Director는 작가·감독·촬영·미술(캐스팅)·음향·음악 스태프 전체. 채팅 답변에는 어느 스태프가 말하는지 표시.
- 화면: 위 진행 단계 표시, 왼쪽 채팅(아래에서 위로 쌓임, 입력창은 심플 모드처럼 떠 있는 상자 · 높이 96px), 오른쪽 결과(브리프/캐스팅/시나리오/편 클립/캔버스/생성·검토). 프로젝트 목록은 왼쪽 사이드 메뉴 "디렉터 프로젝트"(디렉터 모드에서만 표시). 승인 버튼 = 다음 단계 이름 표시, 막힌 이유 표시.
- 단계: 브리프 → 캐스팅(배우·장소·소품 이미지, 승인하면 에셋 라이브러리 등록) → 시나리오(승인된 캐스트로만 작성) → [편 작성 → 캔버스 → 생성 → 검토] × 편수. 승인하면 다음 단계로 자동 전환하고 그 단계의 작업을 시작(생성은 별도 확인).
- 설정: 편수·편당 길이·클립 길이(10초 기본, 1:30 = 10초 × 9)·화면 비율·해상도(720p~2160p)·생성 방식(7+1 Kimchy / 7+1 / 기본 H3). Kimchy 해상도는 `h3-turbo` 카드의 `hires_kim_final_mp`로 변환(1.0~8.5MP로 제한, 제한되면 알림).
- 클립 항목: 화면 묘사 + 대사(작가) + 음향(음향 감독) + 음악(음악 감독) + 출연(캐스트) + 장소. Prompt 카드에는 H3 프롬프트 구조(대사/전체 음향/음악)에 맞춰 합쳐서 전달.
- 이어서 만들기: 새 프로젝트에서 저장된 프로젝트 이름을 말하면 그 프로젝트 전체(설정·캐스트·시나리오·편별 클립)를 읽고, 배우·에셋·화면 설정을 가져옴(이미지 재생성 없음).
- 스키마 2로 올림(1→2 마이그레이션 포함). 새 파일: `src/director/{ai,workflow,series,continuity,compose,demoCrew,DirectorPanel}.ts(x)`, `src/i18n.director.ts`, 테스트 `scripts/test-director-{flow,continuity}.mjs`.
- 검증: `npm run test:director` 156개 통과, typecheck, build. 브라우저(8766)에서 데모 작업팀으로 브리프→캐스팅→시나리오(30편)→편 1(클립 9개×10초)→캔버스(카드 19개: 클립 9×2 + 7+1 카드 1) 까지 단계 전환·승인 차단·이어서 만들기(배우 5명·설정 인계) 확인.
- **미검증**: 실제 LLM 응답으로 한 전체 흐름(데모 작업팀만 시험), 실제 캐스팅 이미지 생성·에셋 라이브러리 등록(서버 필요), 실제 영상 생성, 생성 중 상태 표시, 7+1 카드가 실제 `video-generate`에 연결되어 렌더되는지, 에셋을 클립 생성 카드에 실제로 연결(현재는 클립의 asset_ids까지만), 직접 고치기 화면(없음), 막힘 사유 문구 한글화(현재 영어), ZIP 내보내기(Phase 5), 음악 생성 카드 연동(음악 카드는 아직 안 만듦).

### 화면 디자인 정리 (2026-10-29, 미커밋)
- 브리프: 제목 영역 + 수치 타일 6개(3×2) + 한 편이 10초 클립으로 나뉘는 막대 + 음향/음악 카드 + 컨셉 + "제가 이렇게 정했습니다" 상자.
- 캐스팅(배우/장소/소품 묶음, 포스터형 카드, 이미지 진행 막대), 시나리오(큰 로그라인 + 편 카드 30개), 편 작성(클립 타임라인 + 장면별 클립 카드, 대사·음향·음악 색 구분), 캔버스, 생성·검토(진행 막대 + 실행 방식 + 클립 카드)에 같은 디자인 언어 적용. 승인이 막힐 때의 이유는 한글로 표시(`src/director/localize.ts`).
- 좁은 창(≤900px)은 결과가 위, 채팅이 아래로 쌓임(채팅은 작게).
- **사고 기록**: 화면 시험 중 소스를 고치는 사이 hot reload로 데모 플래그가 풀려 시나리오 단계가 설정된 실제 로컬 LLM(Gemma4)을 불렀음 → GPU 약 90% 몇 분. 페이지를 다시 불러오고 `/interrupt`를 보내 해소(GPU 1%, 큐 0/0 확인). 재발 방지: 데모 선택을 sessionStorage에 유지(`canvers.director.demo`), 시험은 `window.__directorLlm = window.__directorDemo`로만, 시험 중 파일 수정 금지.
- 확인됨(부수): Asset Library 서버(`/tj_node/reflib/assets`)에 실제로 닿음(가짜 이미지는 "읽을 수 없는 이미지"로 거절되고 채팅에 오류로 표시, 흐름은 계속됨). 진짜 이미지 등록은 미검증.

### 캐스트 이미지가 끝까지 따라오기 + 생성 전 자동/수동 선택 (2026-10-29, 미커밋)
- 캐스팅 이미지 고르기: 생성 / 에셋 라이브러리에서 선택 / 갤러리에서 선택(카드의 "라이브러리 / 갤러리에서 고르기"). 라이브러리 선택은 바로 프로젝트 에셋이 되고(재등록 없음), 갤러리 선택은 캐스팅 승인 때 라이브러리에 등록.
- 따라오기: 시나리오(출연진 줄 + 편 카드 아바타) → 편 작성(클립마다 출연·장소 아바타) → 캔버스(클립마다 `@image1, @image2…` 순서로 Load Image 카드 연결, 생성 카드는 다중 참조 엔진 `h3-ref`, 프롬프트에도 `References: @image1 = 서연, …` 줄) → 생성·검토(출연진 줄, 클립별 큰 미리보기).
- 생성 전 선택: 자동(에셋 연결·최신 프롬프트로 캔버스 갱신 → 한 번 확인 → 승인된 클립을 차례로 생성 → 결과를 생성·검토 화면에 표시, 첫 실패에서 멈춤) / 수동(캔버스에서 열기 또는 파일(ZIP)로 받기 + 결과 가져오기). 처음엔 선택 화면만 보이고 실행 버튼은 없음.
- ZIP(편 패키지): `manifest.json`(무엇이 들었고 무엇이 빠졌는지), `README.md`, `canvas.canvers.json`, `prompts.md`, `clips.json`, `assets/*`(가져올 수 있었던 캐스트 이미지; 못 가져온 것은 manifest.missing에 기록하고 들어 있는 척하지 않음). 경로 검사(`..`, 절대경로, 드라이브, 제어문자, 중복 거부), 무압축 ZIP을 직접 작성(Windows .NET ZipFile로도 열림 확인).
- 새 파일: `src/director/{zip,exportPackage,media}.ts`, `scripts/test-director-assets.mjs`. 시험 192개 통과, typecheck, 빌드.
- 브라우저 확인(데모 작업팀, 실제 에셋 라이브러리 이미지 5개 선택): 5/5 이미지 완료, 시나리오 아바타, 클립 아바타 18개, 캔버스 파일에 Load Image 2장·이미지 연결선 18개·엔진 h3-ref, 수동 ZIP(7개 파일), 자동 시작의 확인창(클립 9개) → 취소 시 변화 없음(큐 0/0, GPU 유휴).
- **미검증**: 실제 렌더(`h3-ref` 다중 참조로 `@imageN` 이 실제로 인물에 대응되는지), 갤러리 선택 이미지의 라이브러리 등록, 라이브러리 이미지가 생성 카드에서 `ensureInput`으로 올라가는지(URL 기반 Asset 사용), 결과가 자동 생성 후 생성·검토에 실제로 뜨는지, 음악 생성·에셋화, 갤러리 선택기의 민감 이미지 가림(민감 보기 설정 미반영).

### 편별 진행선 · 시드 · 배치 · 디렉터 LLM (2026-10-29, 커밋됨)
- 스키마 3: 편마다 `stage`/`stage_status`(idle → episode → canvas → execute → review → done). 전역 `workflow.stage`는 intake/brief/references/series, 시나리오 승인 후 `episode` = 제작 열림(편을 사용자가 골라 시작; 자동 시작 없음). 1→2→3 마이그레이션 시험 포함.
- `workflow.ts`: `startEpisodes`(여러 편 동시 시작) `approveEpisode` `reopenEpisode`(한 편만, 만든 것은 지우지 않음) `episodeBlockers` `episodeState`. 승인은 `review_required`일 때만(중복 클릭 무시).
- 화면: 위 단계 줄을 누르면 그 단계를 봄(`store.view`), 회차 줄(`store.focus`, 여러 편 체크 `selEpisodes`), 보는 단계가 현재 단계가 아니면 "이 단계로 되돌리기".
- 시드: 클립 `seed`(없으면 무작위), 어댑터가 생성 카드 시드를 따라가되 캔버스에서 직접 바꾼 시드는 유지(`link.seed_sent`). 선택 클립·편 배치: `execution.planBatch/reseed/requeueClips`, 앱 쪽 `canvasAction.generateBatch`(확인 한 번, 편 순서대로, 실패 시 멈춤/건너뜀, 진행 표시 `store.batch`).
- 디렉터 전용 LLM: `settings.director` + `Llm target="director"`(설정 화면과 채팅 입력창 ⚙ 버튼의 모델 설정 창).
- 결과 우클릭 에셋 등록(Director 밖 공통 기능): `src/ui/RegisterAsset.tsx` + `AssetView` 연결. 중앙 팝업·@태그·카테고리, 같은 이미지가 이미 있으면 그 이름을 알림.
- 시험: `npm run test:director` 230여 개 통과(순수 로직). 브라우저(데모 작업팀): 편 3개 동시 작성/승인/캔버스/생성 단계, 단계 클릭, 생성 범위 27클립 확인창(취소), 클립 체크·시드, 한 편 되돌리기, 모델 설정 창 확인 — GPU 유휴·큐 0/0. 못 본 것: 실제 생성 중 배치 진행 표시.
