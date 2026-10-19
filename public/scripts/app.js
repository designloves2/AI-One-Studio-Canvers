// Shim: the ComfyUI extension scripts of ComfyUI-TJ_NODE_STUDIO_ONE import this path.
// The real object is provided by the Canvers host (src/host) before any extension is loaded.
export const app = window.__studio.app;
export default app;
