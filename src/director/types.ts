// Director Mode data model (docs/DIRECTOR_MODE_DATA_CONTRACT.md). Plain JSON, no functions, so it can be saved, zipped and migrated.
import type { FileRef } from '../types';

export const DIRECTOR_SCHEMA_VERSION = 1;

export type ShotStatus = 'draft' | 'ready' | 'approved' | 'queued' | 'generating' | 'review' | 'done' | 'failed';
export type ApprovalStatus = 'draft' | 'approved';
export type ExecutionMode = 'manual' | 'approval_required' | 'step_by_step' | 'hybrid';
export type AssetRole = 'character' | 'background' | 'prop' | 'reference' | 'audio' | 'other';

export type AssetSource =
  | { kind: 'library'; id: number }
  | { kind: 'file'; file: FileRef }
  | { kind: 'upload'; name: string };

export interface DirectorBrief {
  title: string; purpose: string; audience: string; duration_sec: number; aspect: string; tone: string; language: string; notes: string;
  status: ApprovalStatus;
}

export interface DirectorStory {
  logline: string; synopsis: string;
  /** AI drafts go here only; approved_text is written by the user and never overwritten by an AI draft */
  draft_text: string; approved_text: string; status: ApprovalStatus;
}

export interface DirectorScene { scene_id: string; order: number; title: string; summary: string; status: ApprovalStatus; shot_ids: string[] }

export interface ResultRef { result_id: string; file: FileRef; kind: 'image' | 'video' | 'audio'; node_id?: string; generation_job_id?: string; created_at: string; picked: boolean }

export interface DirectorShot {
  shot_id: string; scene_id: string; order: number; status: ShotStatus; duration_sec: number;
  /** English is what the model gets; Korean is for reading */
  prompt_en: string; prompt_ko: string; camera: string; notes: string;
  asset_ids: string[]; results: ResultRef[];
}

export interface DirectorAsset { asset_id: string; name: string; role: AssetRole; source: AssetSource; note: string }

export interface CanvasLink {
  canvas_id: string; canvas_file: string; shots: { shot_id: string; node_ids: string[] }[]; created_at: string;
  /** the prompt each shot's card was last given by the adapter (tells a user's own edit in the canvas from an untouched card) */
  prompt_sent?: Record<string, string>;
}

export interface DirectorProject {
  app: 'ai-one-studio-canvers';
  kind: 'director-project';
  schema_version: number;
  project_id: string;
  name: string;
  created_at: string; updated_at: string;
  brief: DirectorBrief; story: DirectorStory;
  scenes: DirectorScene[]; shots: DirectorShot[]; assets: DirectorAsset[];
  canvas_links: CanvasLink[];
  settings: { execution_mode: ExecutionMode };
}
