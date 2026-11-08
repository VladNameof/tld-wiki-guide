/**
 * Скачивает официальные миниатюры регионов, предметов, животных, растений и недугов
 * с MediaWiki API The Long Dark Wiki (EN + RU резерв) в папку public/wiki-images/
 * и формирует манифест src/l2-models/data/wikiImagesManifest.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const IMG_OUT_DIR = path.join(PROJECT_ROOT, 'public', 'wiki-images');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'src', 'l2-models', 'data', 'wikiImagesManifest.json');

const EN_API = 'https://thelongdark.fandom.com/api.php';
const RU_API = 'https://the-long-dark.fandom.com/ru/api.php';

/** Список сущностей: ключ -> английские и русские варианты названий страниц Вики */
const ASSET_TARGETS = [
  // Регионы (15)
  { key: 'region-mystery-lake', en: 'Mystery Lake', ru: 'Загадочное озеро', size: 640 },
  { key: 'region-mountain-town', en: 'Mountain Town', ru: 'Горный городок', size: 640 },
  { key: 'region-coastal-highway', en: 'Coastal Highway', ru: 'Прибрежное шоссе', size: 640 },
  { key: 'region-pleasant-valley', en: 'Pleasant Valley', ru: 'Отрадная долина', size: 640 },
  { key: 'region-forlorn-muskeg', en: 'Forlorn Muskeg', ru: 'Одинокая топь', size: 640 },
  { key: 'region-timberwolf-mountain', en: 'Timberwolf Mountain', ru: 'Волчья гора', size: 640 },
  { key: 'region-ash-canyon', en: 'Ash Canyon', ru: 'Пепельный каньон', size: 640 },
  { key: 'region-desolation-point', en: 'Desolation Point', ru: 'Зона запустения', size: 640 },
  { key: 'region-broken-railroad', en: 'Broken Railroad', ru: 'Разбитая железная дорога', size: 640 },
  { key: 'region-hushed-river-valley', en: 'Hushed River Valley', ru: 'Долина Тихой реки', size: 640 },
  { key: 'region-bleak-inlet', en: 'Bleak Inlet', ru: 'Бледная бухта', size: 640 },
  { key: 'region-blackrock', en: 'Blackrock', ru: 'Чёрный камень', size: 640 },
  { key: 'region-forsaken-airfield', en: 'Forsaken Airfield', ru: 'Брошенный аэродром', size: 640 },
  { key: 'region-zone-of-contamination', en: 'Zone of Contamination', ru: 'Зона заражения', size: 640 },
  { key: 'region-sundered-pass', en: 'Sundered Pass', ru: 'Отрезанный перевал', size: 640 },

  // Оружие
  { key: 'item-hunting-rifle', en: 'Hunting Rifle', ru: 'Охотничье ружьё', size: 320 },
  { key: 'item-vaughns-rifle', en: "Vaughn's Rifle", ru: 'Винтовка Вогана', size: 320 },
  { key: 'item-curators-rifle', en: "Curator's Rifle", ru: 'Винтовка Хранителя', size: 320 },
  { key: 'item-revolver', en: 'Revolver', ru: 'Револьвер', size: 320 },
  { key: 'item-survival-bow', en: 'Survival Bow', ru: 'Лук выжившего', size: 320 },
  { key: 'item-sport-bow', en: 'Sport Bow', ru: 'Спортивный лук', size: 320 },
  { key: 'item-distress-pistol', en: 'Distress Pistol', ru: 'Сигнальный пистолет', size: 320 },

  // Инструменты
  { key: 'item-hunting-knife', en: 'Hunting Knife', ru: 'Охотничий нож', size: 320 },
  { key: 'item-hatchet', en: 'Hatchet', ru: 'Топорик', size: 320 },
  { key: 'item-improvised-knife', en: 'Improvised Knife', ru: 'Самодельный нож', size: 320 },
  { key: 'item-improvised-hatchet', en: 'Improvised Hatchet', ru: 'Самодельный топор', size: 320 },
  { key: 'item-heavy-hammer', en: 'Heavy Hammer', ru: 'Тяжёлый молот', size: 320 },
  { key: 'item-hacksaw', en: 'Hacksaw', ru: 'Ножовка', size: 320 },
  { key: 'item-prybar', en: 'Prybar', ru: 'Ломик', size: 320 },
  { key: 'item-storm-lantern', en: 'Storm Lantern', ru: 'Штормовой фонарь', size: 320 },
  { key: 'item-technical-backpack', en: 'Technical Backpack', ru: 'Технический рюкзак', size: 320 },
  { key: 'item-moose-satchel', en: 'Moose-Hide Satchel', ru: 'Сумка из лосиной шкуры', size: 320 },
  { key: 'item-down-bedroll', en: 'Improvised Down Bedroll', ru: 'Спальный мешок', size: 320 },
  { key: 'item-shortwave-radio', en: 'Handheld Shortwave Radio', ru: 'Коротковолновый радиоприёмник', size: 320 },

  // Одежда
  { key: 'item-expedition-parka', en: 'Expedition Parka', ru: 'Экспедиционная парка', size: 320 },
  { key: 'item-bearskin-coat', en: 'Bearskin Coat', ru: 'Шуба из медвежьей шкуры', size: 320 },
  { key: 'item-moose-cloak', en: 'Moose-Hide Cloak', ru: 'Плащ из лосиной шкуры', size: 320 },
  { key: 'item-wolfskin-coat', en: 'Wolfskin Coat', ru: 'Куртка из волчьей шкуры', size: 320 },
  { key: 'item-mackinaw-jacket', en: 'Mackinaw Jacket', ru: 'Куртка «Маккинак»', size: 320 },
  { key: 'item-combat-pants', en: 'Combat Pants', ru: 'Армейские штаны', size: 320 },
  { key: 'item-deerskin-pants', en: 'Deerskin Pants', ru: 'Штаны из оленьей шкуры', size: 320 },
  { key: 'item-mukluks', en: 'Mukluks', ru: 'Муклуки', size: 320 },
  { key: 'item-deerskin-boots', en: 'Deerskin Boots', ru: 'Обувь из оленьей шкуры', size: 320 },
  { key: 'item-aviator-cap', en: 'Aviator Cap', ru: 'Шапка авиатора', size: 320 },
  { key: 'item-balaclava', en: 'Balaclava', ru: 'Балаклава', size: 320 },
  { key: 'item-rabbitskin-mitts', en: 'Rabbitskin Mitts', ru: 'Варежки из кроличьей шкурки', size: 320 },
  { key: 'item-crampons', en: 'Crampons', ru: 'Альпинистские кошки', size: 320 },
  { key: 'item-ballistic-vest', en: 'Ballistic Vest', ru: 'Баллистический жилет', size: 320 },

  // Огонь, еда, медицина
  { key: 'item-mag-lens', en: 'Magnifying Lens', ru: 'Увеличительное стекло', size: 320 },
  { key: 'item-firestriker', en: 'Firestriker', ru: 'Огниво', size: 320 },
  { key: 'item-matches', en: 'Wood Matches', ru: 'Деревянные спички', size: 320 },
  { key: 'item-coal', en: 'Coal', ru: 'Уголь', size: 320 },
  { key: 'item-mre', en: 'Military-Grade MRE', ru: 'Армейский ИРП', size: 320 },
  { key: 'item-pemmican', en: 'Pemmican Bar', ru: 'Пеммикан', size: 320 },
  { key: 'item-cattail', en: 'Cat Tail Stalk', ru: 'Стебель рогоза', size: 320 },
  { key: 'item-salmon', en: 'Cooked Coho Salmon', ru: 'Кижуч', size: 320 },
  { key: 'item-reishi-tea', en: 'Reishi Tea', ru: 'Чай из гриба рейши', size: 320 },
  { key: 'item-rosehip-tea', en: 'Rose Hip Tea', ru: 'Чай из шиповника', size: 320 },
  { key: 'item-birch-tea', en: 'Birch Bark Tea', ru: 'Чай из берёзовой коры', size: 320 },
  { key: 'item-emergency-stim', en: 'Emergency Stim', ru: 'Шприц первой помощи', size: 320 },

  // Фауна и флора
  { key: 'wild-wolf', en: 'Wolf', ru: 'Волк', size: 420 },
  { key: 'wild-timberwolf', en: 'Timberwolf', ru: 'Лесной волк', size: 420 },
  { key: 'wild-poisoned-wolf', en: 'Poisoned Wolf', ru: 'Отравленный волк', size: 420 },
  { key: 'wild-bear', en: 'Bear', ru: 'Медведь', size: 420 },
  { key: 'wild-moose', en: 'Moose', ru: 'Лось', size: 420 },
  { key: 'wild-cougar', en: 'Cougar', ru: 'Пума', size: 420 },
  { key: 'wild-stag', en: 'Stag', ru: 'Олень', size: 420 },
  { key: 'wild-rabbit', en: 'Rabbit', ru: 'Кролик', size: 420 },
  { key: 'wild-ptarmigan', en: 'Ptarmigan', ru: 'Белая куропатка', size: 420 },
  { key: 'wild-crow', en: 'Crow', ru: 'Ворона', size: 420 },
  { key: 'wild-fish', en: 'Lake Whitefish', ru: 'Озёрный сиг', size: 420 },
  { key: 'wild-reishi', en: 'Reishi Mushroom', ru: 'Гриб рейши', size: 360 },
  { key: 'wild-rosehip', en: 'Rose Hip', ru: 'Шиповник', size: 360 },
  { key: 'wild-lichen', en: "Old Man's Beard Lichen", ru: 'Бородатый лишайник', size: 360 },
  { key: 'wild-burdock', en: 'Burdock', ru: 'Лопух', size: 360 },

  // Болезни
  { key: 'aff-hypothermia', en: 'Hypothermia', ru: 'Переохлаждение', size: 280 },
  { key: 'aff-frostbite', en: 'Frostbite', ru: 'Обморожение', size: 280 },
  { key: 'aff-cabin-fever', en: 'Cabin Fever', ru: 'Боязнь замкнутого пространства', size: 280 },
  { key: 'aff-parasites', en: 'Intestinal Parasites', ru: 'Кишечные паразиты', size: 280 },
  { key: 'aff-broken-ribs', en: 'Broken Ribs', ru: 'Сломанные рёбра', size: 280 },
  { key: 'aff-lacerations', en: 'Severe Lacerations', ru: 'Тяжёлые рваные раны', size: 280 },
  { key: 'aff-sprain', en: 'Sprained Ankle', ru: 'Растяжение лодыжки', size: 280 },
  { key: 'aff-blood-loss', en: 'Blood Loss', ru: 'Кровопотеря', size: 280 },
  { key: 'aff-food-poisoning', en: 'Food Poisoning', ru: 'Пищевое отравление', size: 280 },
  { key: 'aff-scurvy', en: 'Scurvy', ru: 'Цинга', size: 280 },
  { key: 'aff-chemical', en: 'Chemical Poisoning', ru: 'Химическое отравление', size: 280 },
];

async function queryThumbnails(apiEndpoint, titleMap, thumbSize = 400) {
  const titles = Object.keys(titleMap);
  const found = {};

  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(thumbSize),
      redirects: '1',
      titles: batch.join('|'),
    });

    const res = await fetch(`${apiEndpoint}?${params.toString()}`, {
      headers: { 'User-Agent': 'TLDWikiGuideAssetSync/1.0' },
    });
    if (!res.ok) continue;
    const data = await res.json();

    // Учитываем редиректы и нормализацию заголовков MediaWiki
    const normMap = new Map();
    for (const n of data?.query?.normalized ?? []) normMap.set(n.to, n.from);
    for (const r of data?.query?.redirects ?? []) {
      const orig = normMap.get(r.from) ?? r.from;
      normMap.set(r.to, orig);
    }

    for (const page of Object.values(data?.query?.pages ?? {})) {
      if (!page?.thumbnail?.source) continue;
      const origTitle = normMap.get(page.title) ?? page.title;
      const key =
        titleMap[origTitle] ??
        Object.entries(titleMap).find(
          ([t]) => t.toLowerCase() === String(origTitle).toLowerCase(),
        )?.[1];
      if (key) {
        found[key] = page.thumbnail.source;
      }
    }
  }
  return found;
}

function guessExt(url, contentType) {
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  if (/\.png/i.test(url)) return 'png';
  if (/\.webp/i.test(url)) return 'webp';
  return 'jpg';
}

async function downloadImage(url, baseKey) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('nocookie.net')) {
    return null;
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TLDWikiGuideAssetSync/1.0',
      Accept: 'image/webp,image/png,image/jpeg,*/*',
    },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) return null;
  const ext = guessExt(url, res.headers.get('content-type') ?? '');
  const filename = `${baseKey}.${ext}`;
  fs.writeFileSync(path.join(IMG_OUT_DIR, filename), buf);
  return `./wiki-images/${filename}`;
}

async function main() {
  fs.mkdirSync(IMG_OUT_DIR, { recursive: true });

  const enMap = {};
  for (const t of ASSET_TARGETS) enMap[t.en] = t.key;
  console.log('Запрос миниатюр с EN Fandom Wiki API ...');
  const enThumbs = await queryThumbnails(EN_API, enMap, 440);

  const missingRuMap = {};
  for (const t of ASSET_TARGETS) {
    if (!enThumbs[t.key] && t.ru) missingRuMap[t.ru] = t.key;
  }
  console.log(`Найдено на EN Wiki: ${Object.keys(enThumbs).length}/${ASSET_TARGETS.length}. Проверка резерва на RU Wiki ...`);
  const ruThumbs = Object.keys(missingRuMap).length > 0 ? await queryThumbnails(RU_API, missingRuMap, 440) : {};

  const allUrls = { ...ruThumbs, ...enThumbs };
  const manifest = {};
  let downloaded = 0;

  for (const target of ASSET_TARGETS) {
    const url = allUrls[target.key];
    if (!url) continue;
    try {
      const relPath = await downloadImage(url, target.key);
      if (relPath) {
        manifest[target.key] = relPath;
        downloaded++;
      }
    } catch (err) {
      console.warn(`Не удалось скачать ${target.key}:`, err.message);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✓ Скачано ${downloaded} изображений в public/wiki-images/ и сохранён манифест!`);
}

main().catch((err) => {
  console.error('Ошибка загрузки изображений:', err.message);
  process.exit(1);
});
