/**
 * Скрипт импорта реальных статей с русскоязычной The Long Dark Fandom Wiki через MediaWiki API.
 * Использует prop=revisions (секция 0) + pageimages + info (совместимо с Fandom без расширения TextExtracts).
 * Соблюдает Prompt Defense Baseline и защиту от перезаписи пустым ответом.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../src/l2-models/data/fandomSynced.json');

const FANDOM_API = 'https://the-long-dark.fandom.com/ru/api.php';

const TARGET_TITLES = [
  'Загадочное озеро',
  'Горный городок',
  'Прибрежное шоссе',
  'Отрадная долина',
  'Одинокая топь',
  'Волчья гора',
  'Пепельный каньон',
  'Зона запустения',
  'Разбитая железная дорога',
  'Долина Тихой реки',
  'Бледная бухта',
  'Чёрный камень',
  'Брошенный аэродром',
  'Выживание',
  'Волк',
  'Медведь',
  'Лось',
  'Пума',
  'Охотничье ружьё',
  'Револьвер',
  'Лук выжившего',
  'Переохлаждение',
  'Обморожение',
  'Кишечные паразиты',
  'Боязнь замкнутого пространства',
];

function sanitizeWikiText(raw) {
  if (typeof raw !== 'string') return '';
  let text = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<ref[\s\S]*?>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');

  for (let i = 0; i < 6; i++) {
    const next = text.replace(/\{\{[^{}]*\}\}/g, ' ');
    if (next === text) break;
    text = next;
  }

  return text
    .replace(/\[\[(?:Файл|File|Image|Изображение|Категория|Category):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,5}/g, '')
    .replace(/==+[^=]+==+/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 750);
}

function validateWikiImageUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('nocookie.net') || parsed.hostname.endsWith('fandom.com'))
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function getRevisionContent(page) {
  const rev = page?.revisions?.[0];
  return rev?.slots?.main?.['*'] ?? rev?.slots?.main?.content ?? rev?.['*'] ?? '';
}

async function fetchBatch(titles) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'revisions|pageimages|info',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
    piprop: 'thumbnail',
    pithumbsize: '480',
    inprop: 'url',
    redirects: '1',
    titles: titles.join('|'),
  });

  const res = await fetch(`${FANDOM_API}?${params.toString()}`, {
    headers: {
      'User-Agent': 'TLDWikiGuideLocalSync/1.0 (Educational Fan Encyclopedia)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log('Подключение к MediaWiki API: https://the-long-dark.fandom.com/ru/api.php ...');
  const articles = [];

  for (let i = 0; i < TARGET_TITLES.length; i += 8) {
    const chunk = TARGET_TITLES.slice(i, i + 8);
    const data = await fetchBatch(chunk);
    const pages = data?.query?.pages ?? {};

    for (const page of Object.values(pages)) {
      if (!page || page.missing !== undefined || !page.title) continue;
      const extract = sanitizeWikiText(getRevisionContent(page));
      if (!extract || extract.length < 20) continue;

      articles.push({
        pageId: Number(page.pageid) || 0,
        title: sanitizeWikiText(page.title).slice(0, 120),
        extract,
        url:
          typeof page.fullurl === 'string' &&
          page.fullurl.startsWith('https://the-long-dark.fandom.com/')
            ? page.fullurl
            : `https://the-long-dark.fandom.com/ru/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        thumbnail: validateWikiImageUrl(page.thumbnail?.source),
        syncedAt: new Date().toISOString(),
      });
    }
  }

  if (articles.length === 0) {
    throw new Error('API вернул 0 подходящих статей — локальный кэш оставлен без изменений.');
  }

  articles.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        source: 'https://the-long-dark.fandom.com/ru/wiki/',
        license: 'CC-BY-SA 3.0 (Fandom Community Attribution)',
        syncedAt: new Date().toISOString(),
        count: articles.length,
        articles,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`✓ Синхронизировано ${articles.length} статей из Fandom Wiki RU -> ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Ошибка синхронизации с Fandom API:', err.message);
  process.exit(1);
});
