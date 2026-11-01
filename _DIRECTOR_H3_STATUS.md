디렉터 — H3 공식 프롬포트 작업 상태 (2026-11-01, 마지막 라운드)

완료된 코드 변경 (typecheck·test:director 통과는 이전 단계에서 확인됨):
1. compose.ts — 카드/그리드 조합문을 "공식 강화 입력용 원문 정보"로 되돌림:
   화면묘사 + References: @imageN = 이름 (S1)… + Dialogue: (S1) <d>[한국어]…</d> + Sound + Music.
   (공식 6섹션 브리프를 앱이 임의로 만들지 않음.)
2. canvasAction.generateClipPrompts — 편 작성 승인(→캔버스 단계 runJob 'canvas')에서
   클립마다 공식 Minimax H3 (Video) 시스템 프롬포트(formatFor('video-generate'))로
   공식 6섹션 브리프(subject_definitions/summary/retention_analysis/detailed_description([Shot 1], <Subject N> (S1) says, <d>)/overall_soundscape/non_diegetic_music) 생성,
   shot.prompt_user 저장. 데모는 demoOfficialBrief(공식 모양 스텐드인). 추가 지시 없음(대사 보존은 공식 룰3이 보장).
3. DirectorView — 편작성 클립 카드/편집 카드에 Ref2vaBox(공식 프롬포트 표시).
4. ai.ts — RULES/지시에서 "앱이 6섹션 구성" 문구 제거, 작업팀은 원문(사람 S1/S2, 대사 "S1: 줄" 원어)만 쓰도록 정리.
5. 시험 갱신(compose 원문 정보 형태).

끝나지 않은 부분:
- 마지막 커밋/푸시 여부를 이 세션에서 확인하지 못함(도구 출력이 계속 유실됨).
  커밋 메시지 의도: "feat(director): generate each clip's video prompt with the official Minimax H3 (Video) system prompt..."
  git add -A / git commit / git push origin main — 실행 안 됐으면 수동으로 실행 필요.
- _tmp_git.txt (마지막 시도 당시 git 상태 덤프).
- 실제 LLM으로 공식 브리프 생성/렌더 파싱은 미확인(사용자 서버 실기 필요).

사용자에게 설명할 것: 공식 시스템 프롬포트 그대로 사용(추측 제거), 대사 보존은 해당 프롬포트 룰3에 포함.