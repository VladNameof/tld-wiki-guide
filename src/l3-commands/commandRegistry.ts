import { MARKER_CATEGORIES } from '../l0-primitives/constants.ts';
import { clampMapCoord } from '../l0-primitives/textUtils.ts';
import type {
  CustomCharcoalNote,
  CustomNoteIcon,
  DifficultyId,
  MapThemeId,
  MarkerCategory,
  SurvivorJournalState,
  WikiSectionId,
} from '../l0-primitives/types.ts';
import { sanitizeUntrustedWikiText } from '../l1-codecs/fandomCodec.ts';
import {
  EMPTY_JOURNAL_STATE,
  loadJournalFromStorage,
  parseSurvivorJournalJson,
  saveJournalToStorage,
  serializeSurvivorJournal,
} from '../l1-codecs/journalCodec.ts';

export interface AppSessionState {
  readonly activeSection: WikiSectionId;
  readonly mapViewLevel: 'world' | 'region';
  readonly selectedRegionId: string;
  readonly focusedMarkerId: string | null;
  readonly difficulty: DifficultyId;
  readonly mapTheme: MapThemeId;
  readonly enabledCategories: readonly MarkerCategory[];
  readonly showMarkerLabels: boolean;
  readonly isDrawingCustomNote: boolean;
  readonly snowEnabled: boolean;
  readonly isSearchModalOpen: boolean;
  readonly journal: SurvivorJournalState;
}

export interface CommandPayloads {
  'nav.setSection': { readonly section: WikiSectionId };
  'map.setViewLevel': { readonly level: 'world' | 'region' };
  'map.selectRegion': {
    readonly regionId: string;
    readonly openRegionMap?: boolean;
    readonly focusMarkerId?: string | null;
  };
  'map.focusMarker': { readonly markerId: string | null };
  'map.setDifficulty': { readonly difficulty: DifficultyId };
  'map.setTheme': { readonly theme: MapThemeId };
  'map.toggleCategory': { readonly category: MarkerCategory };
  'map.setAllCategories': { readonly enabled: boolean };
  'map.toggleMarkerLabels': Record<string, never>;
  'map.setDrawingNoteMode': { readonly active: boolean };
  'ui.toggleSnow': Record<string, never>;
  'ui.setSearchModalOpen': { readonly open: boolean };
  'survivor.toggleVisited': { readonly markerId: string };
  'survivor.addCustomNote': {
    readonly regionId: string;
    readonly x: number;
    readonly y: number;
    readonly title: string;
    readonly note: string;
    readonly icon: CustomNoteIcon;
  };
  'survivor.removeCustomNote': { readonly noteId: string };
  'survivor.importJournal': { readonly json: string };
  'survivor.resetJournal': Record<string, never>;
}

export type CommandId = keyof CommandPayloads;

const ALL_CATEGORY_IDS = MARKER_CATEGORIES.map((c) => c.id);

function createInitialState(): AppSessionState {
  return {
    activeSection: 'home',
    mapViewLevel: 'region',
    selectedRegionId: 'mystery-lake',
    focusedMarkerId: null,
    difficulty: 'voyageur',
    mapTheme: 'charcoal',
    enabledCategories: ALL_CATEGORY_IDS,
    showMarkerLabels: true,
    isDrawingCustomNote: false,
    snowEnabled: true,
    isSearchModalOpen: false,
    journal: loadJournalFromStorage(),
  };
}

type Listener = () => void;

export class TldCommandEngine {
  private state: AppSessionState;
  private readonly listeners = new Set<Listener>();

  constructor(initialState?: AppSessionState) {
    this.state = initialState ?? createInitialState();
  }

  getState = (): AppSessionState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  exportJournalJson = (): string => serializeSurvivorJournal(this.state.journal);

  execute = <K extends CommandId>(id: K, payload: CommandPayloads[K]): AppSessionState => {
    const prev = this.state;
    let next: AppSessionState = prev;

    switch (id) {
      case 'nav.setSection': {
        const p = payload as CommandPayloads['nav.setSection'];
        next = { ...prev, activeSection: p.section, isDrawingCustomNote: false };
        break;
      }
      case 'map.setViewLevel': {
        const p = payload as CommandPayloads['map.setViewLevel'];
        next = {
          ...prev,
          mapViewLevel: p.level,
          isDrawingCustomNote: false,
          focusedMarkerId: null,
        };
        break;
      }
      case 'map.selectRegion': {
        const p = payload as CommandPayloads['map.selectRegion'];
        next = {
          ...prev,
          activeSection: p.openRegionMap ? 'map' : prev.activeSection,
          mapViewLevel: p.openRegionMap ? 'region' : prev.mapViewLevel,
          selectedRegionId: p.regionId,
          focusedMarkerId: p.focusMarkerId ?? null,
          isDrawingCustomNote: false,
        };
        break;
      }
      case 'map.focusMarker': {
        const p = payload as CommandPayloads['map.focusMarker'];
        next = { ...prev, focusedMarkerId: p.markerId };
        break;
      }
      case 'map.setDifficulty': {
        const p = payload as CommandPayloads['map.setDifficulty'];
        next = { ...prev, difficulty: p.difficulty };
        break;
      }
      case 'map.setTheme': {
        const p = payload as CommandPayloads['map.setTheme'];
        next = { ...prev, mapTheme: p.theme };
        break;
      }
      case 'map.toggleCategory': {
        const p = payload as CommandPayloads['map.toggleCategory'];
        const exists = prev.enabledCategories.includes(p.category);
        const enabledCategories = exists
          ? prev.enabledCategories.filter((c) => c !== p.category)
          : [...prev.enabledCategories, p.category];
        next = { ...prev, enabledCategories };
        break;
      }
      case 'map.setAllCategories': {
        const p = payload as CommandPayloads['map.setAllCategories'];
        next = { ...prev, enabledCategories: p.enabled ? ALL_CATEGORY_IDS : [] };
        break;
      }
      case 'map.toggleMarkerLabels': {
        next = { ...prev, showMarkerLabels: !prev.showMarkerLabels };
        break;
      }
      case 'map.setDrawingNoteMode': {
        const p = payload as CommandPayloads['map.setDrawingNoteMode'];
        next = { ...prev, isDrawingCustomNote: p.active };
        break;
      }
      case 'ui.toggleSnow': {
        next = { ...prev, snowEnabled: !prev.snowEnabled };
        break;
      }
      case 'ui.setSearchModalOpen': {
        const p = payload as CommandPayloads['ui.setSearchModalOpen'];
        next = { ...prev, isSearchModalOpen: p.open };
        break;
      }
      case 'survivor.toggleVisited': {
        const p = payload as CommandPayloads['survivor.toggleVisited'];
        const has = prev.journal.visitedMarkerIds.includes(p.markerId);
        const visitedMarkerIds = has
          ? prev.journal.visitedMarkerIds.filter((m) => m !== p.markerId)
          : [...prev.journal.visitedMarkerIds, p.markerId];
        const journal = { ...prev.journal, visitedMarkerIds };
        saveJournalToStorage(journal);
        next = { ...prev, journal };
        break;
      }
      case 'survivor.addCustomNote': {
        const p = payload as CommandPayloads['survivor.addCustomNote'];
        const cleanTitle = sanitizeUntrustedWikiText(p.title, 80) || 'Угольная заметка';
        const cleanBody = sanitizeUntrustedWikiText(p.note, 300);
        const newNote: CustomCharcoalNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          regionId: p.regionId,
          x: clampMapCoord(p.x),
          y: clampMapCoord(p.y),
          title: cleanTitle,
          note: cleanBody,
          icon: p.icon,
          createdAt: new Date().toISOString(),
        };
        const journal = {
          ...prev.journal,
          customNotes: [...prev.journal.customNotes, newNote],
        };
        saveJournalToStorage(journal);
        next = { ...prev, journal, isDrawingCustomNote: false };
        break;
      }
      case 'survivor.removeCustomNote': {
        const p = payload as CommandPayloads['survivor.removeCustomNote'];
        const journal = {
          ...prev.journal,
          customNotes: prev.journal.customNotes.filter((n) => n.id !== p.noteId),
        };
        saveJournalToStorage(journal);
        next = { ...prev, journal };
        break;
      }
      case 'survivor.importJournal': {
        const p = payload as CommandPayloads['survivor.importJournal'];
        const journal = parseSurvivorJournalJson(p.json);
        saveJournalToStorage(journal);
        next = { ...prev, journal };
        break;
      }
      case 'survivor.resetJournal': {
        saveJournalToStorage(EMPTY_JOURNAL_STATE);
        next = { ...prev, journal: EMPTY_JOURNAL_STATE };
        break;
      }
    }

    if (next !== prev) {
      this.state = next;
      for (const listener of this.listeners) {
        listener();
      }
    }
    return this.state;
  };
}

export const commandEngine = new TldCommandEngine();

// Экспонируем движок команд в window для отладки и автоматизации ИИ-агентов (Dual-Mode Bridge)
if (typeof window !== 'undefined') {
  (window as unknown as { __TLD_COMMANDS__: TldCommandEngine }).__TLD_COMMANDS__ = commandEngine;
}
