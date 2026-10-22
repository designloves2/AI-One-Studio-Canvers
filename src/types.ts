export type PortType = 'text' | 'image' | 'video' | 'mask' | 'number' | 'boolean' | 'audio' | 'pipe' | 'lora' | 'any';
export type NodeKind = 'source' | 'edit' | 'generate' | 'llm' | 'output' | 'note' | 'host';

export interface PortDef {
  id: string;
  label: string;
  type: PortType;
  optional?: boolean;
  /** accepts more than one connection */
  multi?: boolean;
}

export type Primitive = string | number | boolean;

export type Control =
  | { kind: 'text'; multiline?: boolean; placeholder?: string }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'slider'; min: number; max: number; step?: number }
  /** `source` = options fetched at runtime from the backend (see ui/useOptions) */
  | { kind: 'select'; options: string[]; source?: string; /** display names (the stored value stays the key) */ labels?: Record<string, string> }
  | { kind: 'toggle' }
  | { kind: 'seed' }
  | { kind: 'size' };

export interface ParamDef {
  id: string;
  label: string;
  control: Control;
  default: Primitive;
  advanced?: boolean;
  /** only show when predicate on the node's params is true */
  when?: (p: Record<string, Primitive>) => boolean;
}

/** A selectable engine behind a generate/llm node (local ComfyUI model family, LLM, ...). */
export interface EngineDef {
  id: string;
  label: string;
  /** which STUDIO_ONE route family / runner handles it */
  family: string;
  /** engine-specific controls, replacing the node's generic ones when present */
  params?: ParamDef[];
  default?: boolean;
  /** modes (Image Generate etc.) this engine implements; undefined = all */
  note?: string;
}

export interface NodeDef {
  id: string;
  title: string;
  category: string;
  kind: NodeKind;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  engines?: EngineDef[];
  description?: string;
  /** true for catalogue entries whose engine is not wired yet */
  planned?: boolean;
  /** hosted ComfyUI node that is executed through /prompt (has a Run button) */
  runnable?: boolean;
}

export interface FileRef {
  filename: string;
  subfolder: string;
  type: 'input' | 'output' | 'temp';
}

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'text' | 'audio';
  url: string;
  file?: FileRef;
  text?: string;
  /** output port this asset belongs to (multi-output nodes) */
  port?: string;
  meta?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  defId: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  params: Record<string, Primitive>;
  engineId?: string;
  results: Asset[];
  activeResult: number;
  /** result ids picked (in order) to be sent on to a connected Video Stitch; empty = only the shown result */
  pick?: string[];
  locked?: boolean;
  title?: string;
  /** card background colour (right-click → Card colour) */
  color?: string;
  /** card text colour (custom colour popup); undefined = theme default */
  textColor?: string;
  /** group frame: ids of the nodes that move with it */
  members?: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface Project {
  id: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedAt: string;
  app: 'ai-one-studio-canvers';
  version: 1;
}

export interface NodeRuntime {
  status: 'idle' | 'running' | 'error';
  pct: number;
  label?: string;
  error?: string;
  /** live sampling preview (animated image) of a video card that has a Model Preview card wired in */
  preview?: string;
}

export const PORT_COLORS: Record<PortType, string> = {
  text: '#b48cff',
  image: '#34c98e',
  video: '#ff6b6b',
  mask: '#c6e94b',
  number: '#e8a33d',
  boolean: '#e8a33d',
  audio: '#4fd1e8',
  pipe: '#e86bb0',
  lora: '#f0c24b',
  any: '#9aa3b5',
};
