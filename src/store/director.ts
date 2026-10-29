import { create } from 'zustand';
import type { DirectorProject } from '../director/types';
import { newDirectorProject, safeProjectName, touch } from '../director/model';
import { deleteDirectorProject, listDirectorProjects, openDirectorProject, saveDirectorProject, type DirectorEntry } from '../backend/director';

interface DirectorState {
  project: DirectorProject | null;
  /** saved file name (null = never saved) */
  file: string | null;
  dirty: boolean;
  /** opened from a newer schema: shown, never saved over */
  readOnly: boolean;
  notes: string[];
  list: DirectorEntry[];
  tab: 'brief' | 'story' | 'board' | 'assets';
  setTab(t: DirectorState['tab']): void;
  refreshList(): Promise<void>;
  create(name: string): void;
  open(name: string): Promise<void>;
  save(): Promise<boolean>;
  remove(name: string): Promise<void>;
  /** change the open project in place (a mutator on a copy), marks it unsaved */
  edit(fn: (p: DirectorProject) => void): void;
}

export const useDirector = create<DirectorState>((set, get) => ({
  project: null, file: null, dirty: false, readOnly: false, notes: [], list: [], tab: 'brief',
  setTab: (tab) => set({ tab }),
  refreshList: async () => { try { set({ list: await listDirectorProjects() }); } catch { set({ list: [] }); } },
  create: (name) => set({ project: newDirectorProject(name), file: null, dirty: true, readOnly: false, notes: [], tab: 'brief' }),
  open: async (name) => {
    const r = await openDirectorProject(name);
    set({ project: r.project, file: name, dirty: false, readOnly: r.readOnly, notes: [...(r.migratedFrom !== undefined ? [`migrated from schema ${r.migratedFrom}`] : []), ...r.warnings] });
  },
  save: async () => {
    const { project, readOnly } = get();
    if (!project || readOnly) return false;
    const file = get().file ?? safeProjectName(project.name);
    if (!file) throw new Error('The project name cannot be used as a file name');
    await saveDirectorProject(file, project);
    set({ file, dirty: false });
    void get().refreshList();
    return true;
  },
  remove: async (name) => {
    await deleteDirectorProject(name);
    if (get().file === name) set({ project: null, file: null, dirty: false, readOnly: false, notes: [] });
    await get().refreshList();
  },
  edit: (fn) => {
    const { project, readOnly } = get();
    if (!project || readOnly) return;
    const copy = JSON.parse(JSON.stringify(project)) as DirectorProject;
    fn(copy);
    set({ project: touch(copy), dirty: true });
  },
}));
