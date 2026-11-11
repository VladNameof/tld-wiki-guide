/**
 * Деплой исходного кода (ветка main) и production-сборки dist/ (ветка gh-pages + GitHub Pages)
 * через официальный GitHub REST & Git Data API.
 * Строго соблюдает политику безопасности: файлы .env / node_modules никогда не индексируются и не выводятся.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_NAME = 'tld-wiki-guide';
const API_BASE = 'https://api.github.com';
const BLOB_CACHE_PATH = path.join(__dirname, '.blob-cache.json');

const ALLOWED_ROOT_FILES = [
  '.gitignore',
  'README.md',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
];

const ALLOWED_DIRS = ['src', 'scripts', 'docs', 'public'];

function loadLocalEnvToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key === 'GITHUB_TOKEN' && val) return val;
  }
  return '';
}

function collectFilesRecursive(baseDir, relPrefix = '') {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (
      entry.name.startsWith('.env') ||
      entry.name === '.blob-cache.json' ||
      entry.name === 'node_modules' ||
      entry.name === '.git'
    ) {
      continue;
    }
    const abs = path.join(baseDir, entry.name);
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursive(abs, rel));
    } else if (entry.isFile()) {
      results.push({ abs, rel });
    }
  }
  return results;
}

function collectMainSourceFiles() {
  const files = [];
  for (const fname of ALLOWED_ROOT_FILES) {
    const abs = path.join(PROJECT_ROOT, fname);
    if (fs.existsSync(abs)) {
      files.push({ abs, rel: fname });
    }
  }
  for (const dir of ALLOWED_DIRS) {
    files.push(...collectFilesRecursive(path.join(PROJECT_ROOT, dir), dir));
  }
  return files;
}

async function ghRequest(token, method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TLD-Wiki-Guide-Deployer',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const retryAfter = Number(res.headers.get('retry-after') || 0);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text.slice(0, 200) };
  }
  return { status: res.status, ok: res.ok, retryAfter, data };
}

async function uploadBlobWithRetry(token, owner, repo, contentB64, label) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const blobRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
      content: contentB64,
      encoding: 'base64',
    });
    if (blobRes.ok) return blobRes.data.sha;
    const isRateLimit = blobRes.status === 403 || blobRes.status === 429;
    const waitMs = isRateLimit
      ? (Math.max(blobRes.retryAfter || 35, 25) + 2) * 1000
      : 1200 * attempt;
    if (attempt < 6) {
      if (isRateLimit) {
        console.log(`  ⏳ Пауза по лимиту GitHub (${Math.round(waitMs / 1000)}с) перед повтором...`);
      }
      await new Promise((r) => setTimeout(r, waitMs));
    } else {
      throw new Error(
        `Не удалось создать blob для ${label} (HTTP ${blobRes.status}: ${blobRes.data?.message ?? ''})`,
      );
    }
  }
}

function loadLocalBlobCache() {
  if (!fs.existsSync(BLOB_CACHE_PATH)) return new Set();
  try {
    const arr = JSON.parse(fs.readFileSync(BLOB_CACHE_PATH, 'utf8'));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveLocalBlobCache(knownShas) {
  fs.writeFileSync(BLOB_CACHE_PATH, JSON.stringify([...knownShas]));
}

function computeGitBlobSha1(buf) {
  const header = Buffer.from(`blob ${buf.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(buf).digest('hex');
}

async function fetchKnownBlobShas(token, owner, repo, branches) {
  const known = loadLocalBlobCache();
  for (const branch of branches) {
    const res = await ghRequest(
      token,
      'GET',
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    );
    if (res.ok && Array.isArray(res.data?.tree)) {
      for (const item of res.data.tree) {
        if (item.type === 'blob' && item.sha) {
          known.add(item.sha);
        }
      }
    }
  }
  return known;
}

async function uploadTreeCommit(
  token,
  owner,
  repo,
  files,
  extraTextFiles,
  branch,
  commitMessage,
  knownShas,
) {
  const treeItems = [];
  const batchSize = 3;
  let uploadedCount = 0;
  let reusedCount = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const chunk = files.slice(i, i + batchSize);
    const chunkItems = await Promise.all(
      chunk.map(async (f) => {
        if (path.basename(f.rel).startsWith('.env')) {
          throw new Error(`Заблокирована попытка загрузки секретного файла: ${f.rel}`);
        }
        const buf = fs.readFileSync(f.abs);
        const localSha = computeGitBlobSha1(buf);
        if (knownShas.has(localSha)) {
          reusedCount++;
          return {
            path: f.rel,
            mode: '100644',
            type: 'blob',
            sha: localSha,
          };
        }
        const contentB64 = buf.toString('base64');
        const sha = await uploadBlobWithRetry(token, owner, repo, contentB64, f.rel);
        knownShas.add(sha);
        uploadedCount++;
        return {
          path: f.rel,
          mode: '100644',
          type: 'blob',
          sha,
        };
      }),
    );
    treeItems.push(...chunkItems);
    if (uploadedCount > 0 && uploadedCount % 30 === 0) {
      saveLocalBlobCache(knownShas);
    }
    // Деликатная пауза между пачками, чтобы не упираться в secondary rate limit GitHub
    await new Promise((r) => setTimeout(r, 380));
    if (i > 0 && (i % 90 === 0 || i + batchSize >= files.length)) {
      console.log(
        `  [${branch}] обработано ${Math.min(i + batchSize, files.length)}/${files.length} (загружено: ${uploadedCount}, кэш-SHA: ${reusedCount})`,
      );
    }
  }
  saveLocalBlobCache(knownShas);

  for (const extra of extraTextFiles) {
    const blobRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
      content: Buffer.from(extra.content, 'utf8').toString('base64'),
      encoding: 'base64',
    });
    if (!blobRes.ok) {
      throw new Error(`Не удалось создать blob для ${extra.rel} (HTTP ${blobRes.status})`);
    }
    treeItems.push({
      path: extra.rel,
      mode: '100644',
      type: 'blob',
      sha: blobRes.data.sha,
    });
  }

  let rootTreeSha = undefined;
  const treeChunkSize = 120;
  for (let i = 0; i < treeItems.length; i += treeChunkSize) {
    const part = treeItems.slice(i, i + treeChunkSize);
    let createdSha = '';
    for (let attempt = 1; attempt <= 4; attempt++) {
      const payload = rootTreeSha ? { base_tree: rootTreeSha, tree: part } : { tree: part };
      const treeRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/trees`, payload);
      if (treeRes.ok && treeRes.data?.sha) {
        createdSha = treeRes.data.sha;
        break;
      }
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      } else {
        throw new Error(`Не удалось создать дерево Git (HTTP ${treeRes.status})`);
      }
    }
    rootTreeSha = createdSha;
    console.log(
      `  [${branch}] дерево Git: ${Math.min(i + treeChunkSize, treeItems.length)}/${treeItems.length} узлов`,
    );
  }

  const refRes = await ghRequest(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const parents = refRes.ok && refRes.data?.object?.sha ? [refRes.data.object.sha] : [];

  const commitRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
    message: commitMessage,
    tree: rootTreeSha,
    parents,
  });
  if (!commitRes.ok) {
    throw new Error(`Не удалось создать коммит в ${branch} (HTTP ${commitRes.status})`);
  }

  if (parents.length > 0) {
    const updateRef = await ghRequest(
      token,
      'PATCH',
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      { sha: commitRes.data.sha, force: true },
    );
    if (!updateRef.ok) {
      throw new Error(`Не удалось обновить ветку ${branch} (HTTP ${updateRef.status})`);
    }
  } else {
    const createRef = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commitRes.data.sha,
    });
    if (!createRef.ok) {
      throw new Error(`Не удалось создать ветку ${branch} (HTTP ${createRef.status})`);
    }
  }

  return commitRes.data.sha.slice(0, 7);
}

async function main() {
  const token = loadLocalEnvToken();
  if (!token) {
    throw new Error('GITHUB_TOKEN не найден в .env или переменных окружения.');
  }

  const distDir = path.join(PROJECT_ROOT, 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('Папка dist/ не найдена. Сначала выполните npm run build.');
  }

  const userRes = await ghRequest(token, 'GET', '/user');
  if (!userRes.ok || !userRes.data?.login) {
    throw new Error(`Ошибка авторизации GitHub API (HTTP ${userRes.status})`);
  }
  const owner = userRes.data.login;
  const pagesUrl = `https://${owner.toLowerCase()}.github.io/${REPO_NAME}/`;

  console.log(`Авторизован на GitHub как: ${owner}`);

  // 1. Проверяем или создаём репозиторий
  const repoCheck = await ghRequest(token, 'GET', `/repos/${owner}/${REPO_NAME}`);
  if (repoCheck.status === 404) {
    console.log(`Создание публичного репозитория ${owner}/${REPO_NAME} ...`);
    const createRes = await ghRequest(token, 'POST', '/user/repos', {
      name: REPO_NAME,
      description:
        'Атмосферный русскоязычный справочник и интерактивная угольная карта по игре The Long Dark (React, TypeScript, Leaflet)',
      homepage: pagesUrl,
      private: false,
      auto_init: true,
    });
    if (!createRes.ok) {
      throw new Error(
        `Не удалось создать репозиторий (HTTP ${createRes.status}): ${createRes.data?.message ?? ''}`,
      );
    }
    // Небольшая пауза, чтобы GitHub завершил auto_init ветки main
    await new Promise((r) => setTimeout(r, 2000));
  } else if (!repoCheck.ok) {
    throw new Error(`Ошибка проверки репозитория (HTTP ${repoCheck.status})`);
  }

  const knownShas = await fetchKnownBlobShas(token, owner, REPO_NAME, ['main', 'gh-pages']);
  console.log(`Найдено существующих Git blob-объектов в репозитории: ${knownShas.size}`);

  // 2. Загружаем исходный код в ветку main
  const mainFiles = collectMainSourceFiles();
  console.log(`Загрузка ${mainFiles.length} файлов исходного кода в ветку main ...`);
  const mainSha = await uploadTreeCommit(
    token,
    owner,
    REPO_NAME,
    mainFiles,
    [],
    'main',
    'feat(v5): Google Street View walkthrough across all 15 regions from 63 LeopardTriX guides + strict zero-overlap map layout',
    knownShas,
  );
  console.log(`✓ Ветка main обновлена (коммит ${mainSha})`);

  // 3. Загружаем собранный статический сайт dist/ в ветку gh-pages
  const distFiles = collectFilesRecursive(distDir);
  console.log(`Загрузка ${distFiles.length} файлов сборки в ветку gh-pages ...`);
  const pagesSha = await uploadTreeCommit(
    token,
    owner,
    REPO_NAME,
    distFiles,
    [{ rel: '.nojekyll', content: '' }],
    'gh-pages',
    'deploy: publish static build to GitHub Pages (v5 Street View + Zero-Overlap Atlas)',
    knownShas,
  );
  console.log(`✓ Ветка gh-pages обновлена (коммит ${pagesSha})`);

  // 4. Включаем GitHub Pages на ветке gh-pages
  const pagesCheck = await ghRequest(token, 'GET', `/repos/${owner}/${REPO_NAME}/pages`);
  if (pagesCheck.status === 404) {
    console.log('Активация GitHub Pages (ветка gh-pages, путь /) ...');
    const enableRes = await ghRequest(token, 'POST', `/repos/${owner}/${REPO_NAME}/pages`, {
      source: { branch: 'gh-pages', path: '/' },
    });
    if (!enableRes.ok && enableRes.status !== 409) {
      console.warn(
        `Предупреждение GitHub Pages (HTTP ${enableRes.status}): ${enableRes.data?.message ?? ''}`,
      );
    } else {
      console.log('✓ GitHub Pages успешно активирован!');
    }
  } else {
    console.log('✓ GitHub Pages уже активен.');
  }

  console.log(`\nГотово!`);
  console.log(`Репозиторий: https://github.com/${owner}/${REPO_NAME}`);
  console.log(`Живой сайт (GitHub Pages): ${pagesUrl}`);
}

main().catch((err) => {
  console.error('Ошибка деплоя:', err.message);
  process.exit(1);
});
