// Director Mode data model, schema 2 (docs/DIRECTOR_MODE_DATA_CONTRACT.md). Plain JSON, no functions, so it can be saved, zipped and migrated.
// The user talks to the Director in a chat; the AI fills these records; the user approves or asks for changes. Nothing here is meant to be typed by hand.
import type { FileRef } from '../types';
import type { SeriesFormat } from './formats';

export const DIRECTOR_SCHEMA_VERSION = 5;

export type ShotStatus = 'draft' | 'ready' | 'approved' | 'queued' | 'generating' | 'review' | 'done' | 'failed';
export type ApprovalStatus = 'draft' | 'approved';
export type ExecutionMode = 'manual' | 'approval_required' | 'step_by_step' | 'hybrid';
export type AssetRole = 'character' | 'background' | 'prop' | 'reference' | 'audio' | 'other';

/** The production line: brief -> casting (references) -> scenario (series plan) -> then every episode. `episode`, `canvas`, `execute`, `review` repeat for every episode (workflow.episode_no). */
export type StageId = 'intake' | 'brief' | 'references' | 'music' | 'series' | 'episode' | 'canvas' | 'execute' | 'review';
export type StageStatus = 'idle' | 'working' | 'review_required' | 'approved' | 'blocked' | 'failed' | 'completed';
/** where ONE episode is in its own line: not started, writing the clips, building the canvas, generating, reviewing, done */
export type EpisodeStage = 'idle' | 'episode' | 'canvas' | 'execute' | 'review' | 'done';

/** The staff. The user is the producer and only talks; the Director answers as whoever the job belongs to. */
export type CrewRole = 'producer_desk' | 'writer' | 'director' | 'cinematographer' | 'art' | 'sound' | 'music';

export type Resolution = '720p' | '1080p' | '1440p' | '2160p';
/** how a clip is rendered: which cards the Canvas gets */
export type GenPreset = 'h3_7plus1_kimchy' | 'h3_7plus1' | 'h3_plain';

export type AssetSource =
  | { kind: 'library'; id: number }
  | { kind: 'file'; file: FileRef }
  | { kind: 'upload'; name: string };

/** Production settings every episode follows. The AI reads them from the user's first message; the user can change them by chat. */
export interface DirectorSeries {
  /** other screen ratios the same piece is also made in (an ad in 16:9 + 9:16 + 1:1): one extra canvas per ratio, made by hand in the Canvas */
  versions?: string[];
  /** the kind of work: drama / film / ad / musicvideo / vlog / short (words on the screen, what the crew cares about) */
  format: SeriesFormat;
  title: string; genre: string; tone: string; logline: string; synopsis: string; language: string;
  total_episodes: number;
  /** length of one episode in seconds (1:30 = 90) */
  episode_seconds: number;
  /** the length one clip is made at (the sweet spot is 10 s); an episode is cut into clips of this length */
  clip_seconds: number;
  aspect: string; resolution: Resolution; preset: GenPreset;
  /** the sound director's overall direction (ambience, dialogue style, mixing) and the music director's theme / style for the whole series */
  sound_direction: string; music_direction: string;
}

export interface DirectorBrief { text: string; assumptions: string[]; status: ApprovalStatus }

export interface DirectorEpisode {
  episode_id: string; no: number; title: string; logline: string;
  /** planned = one line only; drafted = scenes and clips written; approved = the user accepted the clips */
  status: 'planned' | 'drafted' | 'approved';
  /** the finished episode: all clips joined into one video (with the song laid on for a music video) */
  final?: ResultRef;
  /** this episode's own place in the production line (several episodes can be in progress at the same time) */
  stage: EpisodeStage; stage_status: StageStatus;
}

export type ReferenceKind = 'character' | 'location' | 'prop';
/**
 * Casting: an actor, a place or a prop, made as an image BEFORE the scenario is written. The scenario then uses only the approved cast.
 * The lead stays the same in every episode; a new costume or a new look of a place is a variant (variant_of = the base entry's name).
 * An approved image is registered as an asset (asset_id) so it can be used again, in this series and in others.
 */
export interface DirectorReference {
  ref_id: string; kind: ReferenceKind; name: string; description: string; prompt_en: string;
  /** the same prompt in Korean, for reading and for asking for changes (English is what the model gets) */
  prompt_ko?: string;
  status: 'proposed' | 'approved' | 'rejected';
  results: ResultRef[];
  /** name of the base entry when this is a costume / look variant of it */
  variant_of?: string;
  /** the registered asset of the picked image (DirectorAsset.asset_id) */
  asset_id?: string;
  /** the seed this entry's image is generated with (undefined = random); a new seed = a different take */
  seed?: number;
}

export type SectionName = 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro';
export interface SongSection { name: SectionName; start_sec: number; end_sec: number; lyric?: string }
/**
 * The song of a music video. It comes from the producer's own file (source = upload) or is made by the AI (source = generate); both are possible
 * and the producer chooses (screen or chat). The sections tell which part of the song every clip covers.
 */
export interface DirectorMusic {
  source: 'upload' | 'generate' | null;
  title: string; style: string; lyrics: string; language: 'ko' | 'en';
  duration_sec: number; bpm: number;
  /** the music engine of the Music Generate card (acestep / yue2 / minimax) */
  engine?: string;
  sections: SongSection[];
  /** the uploaded file or the generated takes; the picked one is the song */
  candidates: ResultRef[];
  /** the registered asset of the picked song */
  asset_id?: string;
  /** a new seed = a different take of the generated song */
  seed?: number;
  status: ApprovalStatus;
}

export interface DirectorScene { scene_id: string; episode_id: string; order: number; title: string; summary: string; status: ApprovalStatus; shot_ids: string[] }

export interface ResultRef {
  result_id: string; file: FileRef; kind: 'image' | 'video' | 'audio'; node_id?: string; generation_job_id?: string; created_at: string; picked: boolean;
  /** where the image came from: made in the casting canvas, chosen from the Gallery, or chosen from the Asset Library */
  source?: 'generated' | 'gallery' | 'library' | 'demo' | 'upload';
  /** a demo stand-in picture (SVG data URL): nothing was generated */
  data_url?: string;
  /** Asset Library id when source = library (the image is then read from the library, `file` is only a label) */
  lib_id?: number;
}

/** A "shot" is one clip of at most `series.clip_seconds`. */
export interface DirectorShot {
  shot_id: string; scene_id: string; order: number; status: ShotStatus; duration_sec: number;
  /** English is what the model gets; Korean is for reading */
  prompt_en: string; prompt_ko: string; camera: string; notes: string;
  /** spoken lines (writer), sound effects and ambience (sound director), the music for this clip (music director). They map to the H3 prompt's dialogue / overall_soundscape / non_diegetic_music. */
  dialogue: string; sound: string; music: string;
  /** names of the cast entries (references) in this clip, and the place it happens in */
  cast: string[]; location: string;
  /** the seed this clip is generated with (undefined = random every time). Change it to get a different take of just this clip. */
  seed?: number;
  asset_ids: string[]; results: ResultRef[];
}

export interface DirectorAsset { asset_id: string; name: string; role: AssetRole; source: AssetSource; note: string }

export interface CanvasLink {
  canvas_id: string; canvas_file: string; shots: { shot_id: string; node_ids: string[] }[]; created_at: string;
  /** which episode this canvas holds (one canvas per episode) */
  episode_id?: string;
  /** 'casting' = the canvas that makes the cast images (refs below instead of shots) */
  purpose?: 'casting' | 'episode' | 'music';
  /** an extra-ratio version of the episode canvas (the main canvas has none) */
  aspect?: string;
  /** episode canvas: the card whose result is the finished episode (clips joined, with the song on top for a music video) */
  final_node_id?: string;
  /** music canvas: the cards (style, lyrics, generator) */
  music_nodes?: string[];
  refs?: { ref_id: string; node_ids: string[] }[];
  /** the prompt each shot's card was last given by the adapter (tells a user's own edit in the canvas from an untouched card) */
  prompt_sent?: Record<string, string>;
  /** the seed each shot's generator card was last given by the adapter (same idea: a seed the producer typed in the canvas is kept) */
  seed_sent?: Record<string, number>;
  /** casting canvas: the image engine each cast card was last given (an engine chosen in the canvas is kept) */
  engine_sent?: Record<string, string>;
}

export interface DirectorWorkflow {
  /** the global line: intake / brief / references / series; 'episode' means the scenario is approved and production is open (each episode then has its own stage) */
  stage: StageId;
  status: Record<StageId, StageStatus>;
  /** the episode last worked on (1-based); the screen starts there */
  episode_no: number;
}

export interface ChatMsg { id: string; role: 'user' | 'assistant'; text: string; at: string; stage: StageId; /** who answered (assistant messages) */ crew?: CrewRole; notes?: string[]; error?: boolean }

export interface DirectorProject {
  app: 'ai-one-studio-canvers';
  kind: 'director-project';
  schema_version: number;
  project_id: string;
  name: string;
  created_at: string; updated_at: string;
  series: DirectorSeries; brief: DirectorBrief;
  episodes: DirectorEpisode[]; references: DirectorReference[];
  scenes: DirectorScene[]; shots: DirectorShot[]; assets: DirectorAsset[];
  canvas_links: CanvasLink[];
  workflow: DirectorWorkflow; chat: ChatMsg[];
  /** earlier projects this one continues (their whole content is read by the crew; the cast is taken over) */
  continues?: { project_id: string; name: string; file: string }[];
  /** music video: the song */
  music?: DirectorMusic;
  /** generation: how an episode is made. auto = the app connects the assets and generates; manual = the producer opens the canvas or takes a file. Not chosen yet = undefined. */
  settings: {
    execution_mode: ExecutionMode; generation?: 'auto' | 'manual';
    /** casting: the image model the cast images are generated with (an `image-generate` engine id, e.g. krea2 / qwen21 / zimage / klein); undefined = the card's default */
    cast_engine?: string;
    /** casting: auto = every picked cast image becomes an asset when the casting is approved; manual = only the ones the producer registers */
    cast_register?: 'auto' | 'manual';
  };
}
