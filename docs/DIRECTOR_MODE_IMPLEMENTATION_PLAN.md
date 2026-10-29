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
- Phase 1 이후: 시작 전.
