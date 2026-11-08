/**
 * Деплой исходного кода (ветка main) и production-сборки dist/ (ветка gh-pages + GitHub Pages)
 * через официальный GitHub REST & Git Data API.
 * Строго соблюдает политику безопасности: файлы .env / node_modules никогда не индексируются и не выводятся.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_NAME = 'tld-wiki-guide';
const API_BASE = 'https://api.github.com';

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
    if (entry.name.startsWith('.env') || entry.name === 'node_modules' || entry.name === '.git') {
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

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, ok: res.ok, data };
}

async function uploadBlobWithRetry(token, owner, repo, contentB64, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const blobRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
      content: contentB64,
      encoding: 'base64',
    });
    if (blobRes.ok) return blobRes.data.sha;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
    } else {
      throw new Error(`Не удалось создать blob для ${label} (HTTP ${blobRes.status})`);
    }
  }
}

async function uploadTreeCommit(token, owner, repo, files, extraTextFiles, branch, commitMessage) {
  const treeItems = [];
  const batchSize = 5;

  for (let i = 0; i < files.length; i += batchSize) {
    const chunk = files.slice(i, i + batchSize);
    const chunkItems = await Promise.all(
      chunk.map(async (f) => {
        if (path.basename(f.rel).startsWith('.env')) {
          throw new Error(`Заблокирована попытка загрузки секретного файла: ${f.rel}`);
        }
        const contentB64 = fs.readFileSync(f.abs).toString('base64');
        const sha = await uploadBlobWithRetry(token, owner, repo, contentB64, f.rel);
        return {
          path: f.rel,
          mode: '100644',
          type: 'blob',
          sha,
        };
      }),
    );
    treeItems.push(...chunkItems);
  }

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

  const treeRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/trees`, {
    tree: treeItems,
  });
  if (!treeRes.ok) {
    throw new Error(`Не удалось создать дерево Git (HTTP ${treeRes.status})`);
  }

  const refRes = await ghRequest(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const parents = refRes.ok && refRes.data?.object?.sha ? [refRes.data.object.sha] : [];

  const commitRes = await ghRequest(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
    message: commitMessage,
    tree: treeRes.data.sha,
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
    'feat: high-detail topographic maps (A1-H8, trails, powerlines, cliffs) & illustrated encyclopedia with 85 photos',
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
    'deploy: publish static build to GitHub Pages',
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
