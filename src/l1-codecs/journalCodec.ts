import { clampMapCoord } from '../l0-primitives/textUtils.ts';
import type {
  CustomCharcoalNote,
  CustomNoteIcon,
  SurvivorJournalState,
} from '../l0-primitives/types.ts';
import { sanitizeUntrustedWikiText } from './fandomCodec.ts';

export const JOURNAL_STORAGE_KEY = 'tld_survivor_journal_v1';

const VALID_ICONS: ReadonlySet<CustomNoteIcon> = new Set(['stash', 'danger', 'camp', 'arrow']);

export const EMPTY_JOURNAL_STATE: SurvivorJournalState = {
  visitedMarkerIds: [],
  customNotes: [],
  favoriteArticleIds: [],
};

export function parseSurvivorJournalJson(rawJson: string): SurvivorJournalState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new Error(
      `Некорректный JSON дневника выжившего: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Ожидался JSON-объект состояния дневника выжившего.');
  }

  const record = parsed as Record<string, unknown>;

  const visitedMarkerIds = Array.isArray(record.visitedMarkerIds)
    ? Array.from(
        new Set(
          record.visitedMarkerIds
            .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 80)
            .slice(0, 1000),
        ),
      )
    : [];

  const favoriteArticleIds = Array.isArray(record.favoriteArticleIds)
    ? Array.from(
        new Set(
          record.favoriteArticleIds
            .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 80)
            .slice(0, 500),
        ),
      )
    : [];

  const customNotes: CustomCharcoalNote[] = [];
  if (Array.isArray(record.customNotes)) {
    for (const item of record.customNotes.slice(0, 300)) {
      if (!item || typeof item !== 'object') continue;
      const noteObj = item as Record<string, unknown>;
      const id = sanitizeUntrustedWikiText(noteObj.id, 64);
      const regionId = sanitizeUntrustedWikiText(noteObj.regionId, 64);
      const title = sanitizeUntrustedWikiText(noteObj.title, 80);
      const note = sanitizeUntrustedWikiText(noteObj.note, 300);
      if (!id || !regionId || !title) continue;

      const iconCandidate = noteObj.icon as CustomNoteIcon;
      const icon: CustomNoteIcon = VALID_ICONS.has(iconCandidate) ? iconCandidate : 'stash';

      customNotes.push({
        id,
        regionId,
        x: clampMapCoord(Number(noteObj.x)),
        y: clampMapCoord(Number(noteObj.y)),
        title,
        note,
        icon,
        createdAt:
          typeof noteObj.createdAt === 'string'
            ? noteObj.createdAt.slice(0, 40)
            : new Date().toISOString(),
      });
    }
  }

  return {
    visitedMarkerIds,
    customNotes,
    favoriteArticleIds,
  };
}

export function serializeSurvivorJournal(state: SurvivorJournalState): string {
  return JSON.stringify(state, null, 2);
}

export function loadJournalFromStorage(): SurvivorJournalState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return EMPTY_JOURNAL_STATE;
  }
  const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
  if (!raw) return EMPTY_JOURNAL_STATE;

  try {
    return parseSurvivorJournalJson(raw);
  } catch (err) {
    console.warn('[TLD Journal] Повреждённые данные localStorage сброшены к дефолту:', err);
    return EMPTY_JOURNAL_STATE;
  }
}

export function saveJournalToStorage(state: SurvivorJournalState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, serializeSurvivorJournal(state));
  } catch (err) {
    console.error('[TLD Journal] Не удалось сохранить дневник в localStorage:', err);
  }
}
