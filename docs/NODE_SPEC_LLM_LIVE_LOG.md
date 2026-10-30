# 요구사항: LLM 실시간 로그 + 생각(`</think>`) 처리 (코어 노드 → 스튜디오 → 웹 → 캔버스)

작성: 캔버스 세션(`AI-One-Studio-Canvers`), 2026-10-30. **진행은 2026-11-01 오후 10시 이후**(사용자 지시).
진행 순서(사용자 지시): ① 코어 노드 `ComfyUI-TJ_NODE`(LLM(TJ) 구현체) → ② 스튜디오 `ComfyUI-TJ_NODE_STUDIO_ONE`(`/tj_studio_one/llm/enhance` 라우트) → ③ 웹 세션 `AI-ONE-STUDIO` → ④ 캔버스 세션(이 저장소).
이 문서는 ①번 세션에 전달하는 요구사항입니다. 캔버스 저장소는 노드 코드를 수정하지 않습니다. 명세가 어긋나면 캔버스 쪽이 맞춥니다.

## 1. 왜 필요한가
- Director Mode 는 LLM 을 여러 번 부릅니다(캐스팅 3번, 시나리오 여러 번, 편 작성 여러 번). 로컬 모델(llama.cpp / GGUF / comfy TextGenerate)은 **컴피 콘솔에 입력·출력 크기와 속도가 보이지 않고**, 끝날 때까지 앱이 아무것도 알 수 없습니다(느린 건지 멈춘 건지 구분 불가).
- 앱은 지금 호출 전후로 글자 수와 시간만 잽니다(`src/backend/llmLog.ts`, 토큰 수는 글자/2.5 어림). 정확한 토큰 수와 진행 중 정보는 노드만 알 수 있습니다.

## 2. 요구 1 — 진행 중 이벤트 (ComfyUI 웹소켓)
LLM 호출이 도는 동안 노드가 ComfyUI 웹소켓(`PromptServer.instance.send_sync`)으로 이벤트를 보냅니다. 앱은 이미 같은 웹소켓으로 생성 진행률을 받고 있어서 이 방식이 앱 변경이 가장 작습니다.

- 이벤트 이름: `tj_llm_progress`
- 요청에 `call_id`(문자열, 앱이 만들어 보냄)가 있으면 그대로 돌려줍니다. 없으면 노드가 만듭니다.
- 페이로드 안(필드 이름은 제안이며 코어 세션이 바꿔도 됩니다. 바꾸면 이 문서를 같이 고칠 것):

```json
{
  "call_id": "dx-1730300000-3",
  "backend": "local",            // local | comfy | ollama | openrouter | custom
  "model": "Qwen3.5-9B-Q8_0.gguf",
  "phase": "prompt | thinking | answer | done | error",
  "input_tokens": 3120,           // 프롬프트 토큰 수 (알면)
  "output_tokens": 842,           // 지금까지 생성한 토큰 수
  "chars": 2460,                  // 지금까지 나온 글자 수
  "tok_per_sec": 18.4,            // 생성 속도 (프롬프트 처리 속도는 따로 prompt_tok_per_sec)
  "elapsed_ms": 45700,
  "delta": "…방금 나온 글 조각…",   // 선택. 없으면 숫자만
  "finish_reason": "stop | length | error"   // phase 가 done / error 일 때
}
```

- 보내는 빈도: 약 0.5~1초마다 한 번(또는 N 토큰마다). 너무 잦으면 웹소켓이 막히니 묶어서 보냄.
- `phase`: 모델이 `<think>` 구간을 쓰는 동안은 `thinking`, `</think>` 이후는 `answer`. 구분이 어려우면 생략 가능.
- 백엔드별 사정: llama.cpp(서버 스트리밍 `stream:true`), ollama(`stream`), OpenRouter / custom(SSE)은 스트림을 읽어서 만들 수 있음. comfy TextGenerate 처럼 스트림이 불가능한 백엔드는 시작(`prompt`)과 끝(`done`)만 보내도 됨.

## 3. 요구 2 — 컴피 콘솔에도 한 줄씩
같은 정보를 콘솔에도 남깁니다. 지금은 `[TJ_PromptEnhancer] finish_reason=stop max_tokens=4975 raw_chars=7165` 같은 끝 로그만 있어서, 호출이 끝날 때 한 줄로 다음을 찍어 주세요.

`[TJ_LLM] backend=local model=… in=3120tok out=842tok time=45.7s speed=18.4tok/s finish=stop`

진행 중에는 10초마다 한 줄 정도(`… 12.0s out=210tok 17.5tok/s`)면 충분합니다.

## 4. 요구 3 — 최종 응답에 usage 포함
`/tj_studio_one/llm/enhance`(와 `image_to_prompt`) 최종 JSON 응답에 필드를 추가합니다. 앱은 이미 `usage` 가 있으면 읽습니다(`src/backend/llm.ts`).

```json
{ "ok": true, "result": "…", "usage": { "input_tokens": 3120, "output_tokens": 842, "tok_per_sec": 18.4, "elapsed_ms": 45700, "finish_reason": "stop" } }
```

`finish_reason: "length"`(max_tokens 에서 잘림)는 앱이 "답이 끊겼다"고 알려 주는 데 씁니다. 지금은 JSON 이 중간에서 깨진 것으로만 보입니다.

## 5. 요구 4 — `</think>` 처리 (별건, 같이 처리 부탁)
- 실제 사고(2026-10-30): 모델이 `<think>` 여는 태그 없이 생각을 길게 쓴 뒤 `</think>` 를 쓰고 그 아래에 올바른 JSON 을 냈는데(원문 7,165자, 답은 1천 자 정도), 서버가 "모델이 프롬프트 대신 생각을 적었다"며 거절했습니다. 로그: `[TJ_PromptEnhancer] finish_reason=stop max_tokens=4975 raw_chars=7165`.
- 요구: 응답에 `</think>`(또는 `</thinking>`)가 있으면 **여는 태그가 없어도 마지막 `</think>` 뒤의 글만** 답으로 씁니다. 그 뒤가 비어 있을 때만 거절합니다. `<think>…</think>` 짝이 있는 경우는 지금처럼 걷어냅니다.
- 앱도 같은 규칙으로 한 번 더 걷어냅니다(`ai.stripThinking`). 서버가 먼저 거절하면 앱은 받을 수 없어서 서버 쪽 수정이 필요합니다.
- 선택: `phase` 와 함께 생각 부분 글자 수 / 답 글자 수를 usage 에 넣어 주면(`thinking_chars`, `answer_chars`) 화면에서 "생각이 90%" 같은 안내를 할 수 있습니다.

## 6. 캔버스 쪽(④)이 할 일 — 앞 단계가 오면
- `call_id` 를 만들어 요청에 실어 보냄(`src/backend/llm.ts`).
- 웹소켓에서 `tj_llm_progress` 를 받아 `backend/llmLog.ts` store 에 반영.
- 디렉터 화면에 실시간 패널: 부분별 진행(예 "캐스팅 인물 1/3 · 생각 중 · 1,240자 · 18 tok/s · 45초"), 지금까지 나온 글 미리보기(접기), 멈춤 감지(N 초 동안 변화 없음). 호출이 끝나면 지금의 "최근 LLM 호출" 표에 정확한 토큰 수로 남김.
- `finish_reason: length` 이면 "답이 끊겼다. 설정에서 최대 토큰을 늘리세요" 안내.

## 7. 호환
- 이벤트·필드는 모두 **추가**입니다. 옛 앱(이벤트를 모르는)은 그대로 동작해야 합니다.
- `call_id` 를 안 보내는 옛 클라이언트에도 에러 없이 동작.
- 웹 세션(③)과 캔버스 세션(④)은 같은 이벤트 이름·필드를 씁니다. 코어 세션이 이름을 바꾸면 스튜디오 → 웹 → 캔버스 순으로 같은 명세를 받아야 합니다.

## 8. 확인할 것(코어 세션이 정해 줄 것)
1. 이벤트 이름·필드 이름 확정.
2. 어느 백엔드까지 스트림 진행을 지원하는지(local / comfy / ollama / openrouter / custom 별 표).
3. 스튜디오 라우트가 코어 이벤트를 그대로 전달하는지, 호출마다 `call_id` 를 어떻게 이어 주는지.
