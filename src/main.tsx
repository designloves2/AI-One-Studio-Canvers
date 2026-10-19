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
if (import.meta.env.DEV) Object.assign(window, { __canvers: { useGraph, runNode, buildImageGraph, useSettings, REGISTRY, hostStatus, hostApp } });
