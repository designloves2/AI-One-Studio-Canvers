# Notice / 고지

**AI ONE Studio Canvers** is licensed under the **GNU General Public License v3.0 only** (see [LICENSE](LICENSE)).
이 프로젝트는 **GPL-3.0** 으로 배포됩니다.

Why GPL-3.0: this project talks to ComfyUI-TJ_NODE_STUDIO_ONE, which is distributed under GPL-3.0, and ports the LTX 2.5 Director
timeline format from it (derived from LTX-2.5-Director by CGlide, itself a fork of WhatDreamsCost's LTX Director, both GPL-3.0).

## Third-party
- ComfyUI-TJ_NODE_STUDIO_ONE / ComfyUI-TJ_NODE (designloves2) — GPL-3.0 / MIT, used through their HTTP API and node interfaces.
- LTX-2.5-Director (CGlide) and LTX Director (WhatDreamsCost) — GPL-3.0; timeline data format ported in `src/backend/ltxTimeline.ts`.
- freavy (MIT) — the node-canvas interaction concept was studied; no code is copied.
- Libraries: React, @xyflow/react, zustand, Vite … under their own (MIT) licenses.
