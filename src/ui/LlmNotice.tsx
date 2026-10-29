import { cancelWaiting, useLlmNotice } from '../backend/llmGuard';
import { useT } from '../i18n';

/** Yellow notice above the bottom toolbar (centered): why a local-LLM request is waiting. The Live Canvas shows its own inside the chat. */
export function LlmNotice({ mode }: { mode: import('../store/graph').AppMode }) {
  const T = useT();
  const text = useLlmNotice((s) => s.bottom);
  if (!text) return null;
  return (
    <div className={`llm-notice in-${mode}`} role="status">
      <span>⚠ {text}</span>
      <button onClick={() => cancelWaiting('bottom')}>{T('Cancel')}</button>
    </div>
  );
}
