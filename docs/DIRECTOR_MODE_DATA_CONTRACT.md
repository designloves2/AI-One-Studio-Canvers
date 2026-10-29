# Director Mode — 데이터 계약 (초안 v1, Phase 0)

상태: **설계 초안**. 구현 전이며 Phase 1에서 코드로 확정한다. 명세 §데이터 모델을 이 저장소 현실에 맞게 좁힌 것.

## 1. 저장 위치
- 기존 `canvases/`(캔버스 목록)와 **분리**: `director/<project_name>.director.json` (환경변수 `CANVERS_DIR`와 같은 방식으로 `CANVERS_DIRECTOR_DIR` 지원).
- 이유: `server-lib/canvases.mjs list()`가 `canvases/*.json` 전부를 캔버스로 센다. 섞으면 캔버스 목록이 깨진다.
- 서버 라우트(신규, 같은 패턴): `GET /canvers/director`, `GET|PUT|DELETE /canvers/director/<name>`. 임시파일→rename 저장, 이름 규칙·크기 제한은 canvases와 동일. 새 파일 `server-lib/director.mjs`, `serve.mjs`와 `vite.config.ts`에 연결.
- 덮어쓰기 보호: 저장 직전 기존 파일을 `director/.backup/<name>.<timestamp>.json`으로 최근 10개 보관(기존 앱에는 없는 정책, Director 파일에만 적용).

## 2. 파일 최상위
```jsonc
{
  "app": "ai-one-studio-canvers",
  "kind": "director-project",
  "schema_version": 1,
  "project_id": "dp_xxxx",          // 세 모드 공통 id. Canvas의 Project.id와 같게 쓴다
  "name": "…",
  "created_at": "ISO", "updated_at": "ISO",
  "brief": { … }, "story": { … },
  "scenes": [ … ], "shots": [ … ], "assets": [ … ],
  "canvas_links": [ … ],            // Director ↔ Canvas 연결
  "settings": { "execution_mode": "manual" }
}
```
- 읽을 때 `schema_version`이 현재보다 높으면 **읽기 전용으로 열고 경고**(덮어쓰기 금지). 낮으면 `migrate()` 체인으로 올리고, 올린 사실을 `updated_at`과 함께 기록.
- 모르는 필드는 버리지 않고 보존한다(다른 버전이 쓴 값 유실 방지).

## 3. 식별자
- 형식 `<접두사>_<12자 base36>`: `dp_`(project) `sc_`(scene) `sh_`(shot) `as_`(asset) `cv_`(canvas) `jb_`(generation_job).
- 한 번 만들면 바꾸지 않는다. 순서·이름·파일 경로가 바뀌어도 id는 유지. 생성은 `uid()`와 같은 방식.
- `node_id`는 Canvas 그래프의 `GraphNode.id`를 그대로 참조.

## 4. 엔터티
```ts
Brief   { title, purpose, audience, duration_sec, aspect, tone, language, notes, status }
Story   { logline, synopsis, status: 'draft'|'approved', approved_text?, draft_text? }   // AI는 draft_*만 쓴다
Scene   { scene_id, order, title, summary, status, shot_ids[] }
Shot    { shot_id, scene_id, order, status, duration_sec, prompt_en, prompt_ko?, camera?, asset_ids[],
          canvas_link?: {canvas_id, node_ids[]}, results: ResultRef[], notes }
ShotStatus = 'draft'|'ready'|'approved'|'queued'|'generating'|'review'|'done'|'failed'
Asset   { asset_id, name, role: 'character'|'background'|'prop'|'reference'|'audio'|'other',
          source_ref: {kind:'library', id:number} | {kind:'file', file: FileRef} | {kind:'upload', path}, note }
ResultRef { result_id, asset: Asset(Canvers) 의 FileRef, node_id?, generation_job_id?, created_at, picked: boolean }
CanvasLink { canvas_id, canvas_file: string /* canvases/ 의 이름 */, shots: {shot_id, node_ids[]}[], created_at }
```
- 프롬프트는 영어(`prompt_en`)가 모델 입력, 한국어는 보기용 — 기존 규칙과 동일.
- 승인(`approved`)된 샷/스토리는 AI 재생성이 덮어쓰지 못한다. 새 초안은 `draft_*` 또는 새 버전으로만 추가.

## 5. Director → Canvas 어댑터 (순수 함수)
`buildCanvasFromDirector(project, opts) → { project: Project, report }`
- 입력의 `Project`(기존 형식)를 그대로 만든다 → `.canvers.json` 호환 유지, `version:1` 유지.
- 샷 1개 = `prompt` 텍스트 카드(+ 필요 시 `image-generate` 또는 `video-generate`) 와 엣지. 사용할 `defId`/포트는 `REGISTRY`에서 읽고, **없으면 다른 카드로 바꿔치기하지 않고 `report.missing`에 적어 해당 샷을 건너뜀**.
- 멱등: 같은 `shot_id`에는 같은 결정적 노드 id(`n_<shot_id>_<slot>`)를 쓰고, 다시 만들 때 `canvas_links`의 `node_ids`로 기존 카드를 찾아 갱신(중복 생성 금지). 사용자가 캔버스에서 옮긴 위치·바꾼 파라미터는 덮어쓰지 않는다.
- 카드 `results`(이미 생성된 결과)는 어댑터가 지우지 않는다.

## 6. Canvas → Director 결과 연결
- 캔버스 노드 `results`(Asset)를 샷 `results[]`에 `ResultRef`로 복사 참조(파일은 복사하지 않음, `FileRef`만).
- 연결 키는 `canvas_links[].shots[].node_ids`. 노드가 삭제되면 링크를 끊고 샷 상태를 바꾸지 않고 경고만 낸다.

## 7. ZIP 패키지 (Phase 5)
```
manifest.json            { schema_version, app, exported_at, files[]{path,sha256,bytes} }
project.json             위 최상위(비밀 제외)
brief.md  story/draft.md  story/approved.md
assets/assets.json       source_ref만 (실제 파일은 옵션 포함: assets/files/…)
production/shots.json  production/status.json
canvases/<name>.canvers.json
schemas/director-project.v1.json
validation_report.json
```
- 경로 검증: 항목 이름은 `/`로 구분된 상대 경로만, `..`·절대경로·드라이브 문자·제어문자 거부(쓸 때와 읽을 때 모두).
- 비밀 제외: API 키·토큰·`Settings.keys`·서버 URL·로컬 절대경로는 어떤 파일에도 넣지 않는다. `source_ref.upload.path`는 파일명만.

## 8. 실행 모드 (settings.execution_mode)
`manual`(기본) · `approval_required` · `step_by_step` · `hybrid`. 기본값에서는 Director가 **생성 실행을 자동으로 시작하지 않는다**. 실행은 사용자가 샷/캔버스에서 명시적으로 누른 것만.

## 9. 미결정(구현 계획에서 확정)
- 샷 하나가 이미지+비디오 두 카드를 만들 때의 기본 템플릿.
- 여러 Director 프로젝트와 여러 Canvas의 1:N 연결 UI.
