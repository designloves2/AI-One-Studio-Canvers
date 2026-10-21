import { insertDeck, BUILTIN_DECKS } from './decks';
import { importFile } from './engine/run';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlowProvider } from '@xyflow/react';
import { App } from './App';
import './styles.css';
import { useGraph } from './store/graph';
import { runNode } from './engine/actions';
import { buildImageGraph } from './backend/imageGen';
import { useSettings } from './store/settings';
import { REGISTRY } from './registry';
import { hostStatus, hostApp } from './host';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactFlowProvider><App /></ReactFlowProvider>
  </React.StrictMode>,
);

// dev-only handle for the end-to-end checks
if (import.meta.env.DEV) Object.assign(window, { __canvers: { useGraph, runNode, buildImageGraph, useSettings, REGISTRY, hostStatus, hostApp, insertDeck, BUILTIN_DECKS, importFile } });

// ?imedebug : shows the last keyboard / composition events of the focused text field, to find out what breaks Korean input
if (location.search.includes('imedebug')) {
  const box = Object.assign(document.createElement('pre'), { style: 'position:fixed;right:8px;bottom:8px;z-index:99999;max-height:45vh;width:430px;overflow:auto;margin:0;padding:6px;background:#000d;color:#9f9;font:11px/1.3 monospace;pointer-events:none' });
  document.body.append(box);
  const lines: string[] = [];
  for (const ev of ['keydown', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend', 'focusout', 'blur']) {
    window.addEventListener(ev, (e) => {
      const t = e.target as HTMLTextAreaElement;
      if (!t || !('value' in t)) return;
      const x = e as KeyboardEvent & InputEvent & CompositionEvent;
      lines.push(`${ev} ${x.key ?? ''}${x.data != null ? ' d=' + x.data : ''}${x.isComposing ? ' C' : ''}${x.defaultPrevented ? ' PREVENTED' : ''} v="${t.value.slice(-8)}"`);
      box.textContent = lines.slice(-28).join('\n'); box.scrollTop = box.scrollHeight;
    }, true);
  }
}
