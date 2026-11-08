import type { FandomSyncedArticle } from '../l0-primitives/types.ts';

const FANDOM_API_ENDPOINT = 'https://the-long-dark.fandom.com/ru/api.php';

export function sanitizeUntrustedWikiText(raw: unknown, maxLength = 900): string {
  if (typeof raw !== 'string') return '';
  let text = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<ref[\s\S]*?>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');

  // Удаляем вложенные шаблоны MediaWiki {{...}} за несколько проходов
  for (let i = 0; i < 6; i++) {
    const next = text.replace(/\{\{[^{}]*\}\}/g, ' ');
    if (next === text) break;
    text = next;
  }

  return text
    // Удаляем служебные ссылки на файлы и категории
    .replace(/\[\[(?:Файл|File|Image|Изображение|Категория|Category):[^\]]*\]\]/gi, ' ')
    // Разворачиваем вики-ссылки [[Статья|Текст]] -> Текст
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    // Убираем внешние вики-скобки и кавычки жирного/курсивного начертания
    .replace(/'{2,5}/g, '')
    .replace(/==+[^=]+==+/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateFandomUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === 'the-long-dark.fandom.com' ||
      host.endsWith('.fandom.com') ||
      host.endsWith('.nocookie.net');
    return allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function buildFandomWikiUrl(slugOrTitle: string): string {
  const clean = slugOrTitle.trim().replace(/\s+/g, '_');
  return `https://the-long-dark.fandom.com/ru/wiki/${encodeURIComponent(clean)}`;
}

function extractRevisionText(page: Record<string, unknown>): string {
  if (typeof page.extract === 'string' && page.extract.trim()) {
    return page.extract;
  }
  const revisions = page.revisions;
  if (!Array.isArray(revisions) || revisions.length === 0) return '';
  const firstRev = revisions[0] as {
    '*'?: unknown;
    slots?: { main?: { '*'?: unknown; content?: unknown } };
  };
  const slotContent = firstRev?.slots?.main?.content ?? firstRev?.slots?.main?.['*'] ?? firstRev?.['*'];
  return typeof slotContent === 'string' ? slotContent : '';
}

export function parseFandomQueryResponse(payload: unknown): FandomSyncedArticle[] {
  if (!payload || typeof payload !== 'object') return [];
  const queryObj = (
    payload as {
      query?: {
        pages?: Record<string, unknown>;
        search?: Array<{ pageid?: unknown; title?: unknown; snippet?: unknown }>;
      };
    }
  ).query;
  if (!queryObj) return [];

  const snippetByPageId = new Map<number, string>();
  if (Array.isArray(queryObj.search)) {
    for (const item of queryObj.search) {
      if (typeof item?.pageid === 'number' && typeof item.snippet === 'string') {
        snippetByPageId.set(item.pageid, item.snippet);
      }
    }
  }

  const results: FandomSyncedArticle[] = [];

  if (queryObj.pages && typeof queryObj.pages === 'object') {
    for (const rawPage of Object.values(queryObj.pages)) {
      if (!rawPage || typeof rawPage !== 'object') continue;
      const page = rawPage as Record<string, unknown> & {
        pageid?: unknown;
        title?: unknown;
        fullurl?: unknown;
        missing?: unknown;
        thumbnail?: { source?: unknown };
      };

      if (page.missing !== undefined) continue;
      const pageId = typeof page.pageid === 'number' ? page.pageid : 0;
      const title = sanitizeUntrustedWikiText(page.title, 140);

      const rawBody = extractRevisionText(page) || snippetByPageId.get(pageId) || '';
      const extract = sanitizeUntrustedWikiText(rawBody, 900);
      if (!title || !extract) continue;

      const safeUrl = validateFandomUrl(page.fullurl) ?? buildFandomWikiUrl(title);
      const safeThumb = validateFandomUrl(page.thumbnail?.source);

      results.push({
        pageId,
        title,
        extract,
        url: safeUrl,
        thumbnail: safeThumb,
        syncedAt: new Date().toISOString(),
      });
    }
  }

  // Fallback если вернулся только list=search без pages
  if (results.length === 0 && Array.isArray(queryObj.search)) {
    for (const item of queryObj.search) {
      const title = sanitizeUntrustedWikiText(item?.title, 140);
      const extract = sanitizeUntrustedWikiText(item?.snippet, 900);
      if (!title || !extract) continue;
      results.push({
        pageId: typeof item.pageid === 'number' ? item.pageid : 0,
        title,
        extract,
        url: buildFandomWikiUrl(title),
        thumbnail: null,
        syncedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

export async function fetchLiveFandomSearch(
  searchQuery: string,
  signal?: AbortSignal,
): Promise<FandomSyncedArticle[]> {
  const cleanQuery = sanitizeUntrustedWikiText(searchQuery, 80);
  if (!cleanQuery) return [];

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    list: 'search',
    srsearch: cleanQuery,
    srlimit: '8',
    generator: 'search',
    gsrsearch: cleanQuery,
    gsrlimit: '8',
    prop: 'revisions|pageimages|info',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
    piprop: 'thumbnail',
    pithumbsize: '400',
    inprop: 'url',
  });

  const response = await fetch(`${FANDOM_API_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ошибка ответа Fandom Wiki API (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  return parseFandomQueryResponse(data);
}
