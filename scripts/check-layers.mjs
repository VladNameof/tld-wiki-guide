import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

const LAYER_ORDER = [
  'l0-primitives',
  'l1-codecs',
  'l2-models',
  'l3-commands',
  'l4-renderers',
  'l5-ui',
];

function getLayerIndex(filePath) {
  const rel = path.relative(srcRoot, filePath).replace(/\\/g, '/');
  const topDir = rel.split('/')[0];
  return LAYER_ORDER.indexOf(topDir);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const importRegex = /from\s+['"]([^'"]+)['"]/g;
let violations = 0;

for (const file of walkFiles(srcRoot)) {
  const fromLayer = getLayerIndex(file);
  if (fromLayer === -1) continue;

  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;

    const resolved = path.resolve(path.dirname(file), spec);
    const toLayer = getLayerIndex(resolved);
    if (toLayer > fromLayer) {
      console.error(
        `[LAYER VIOLATION] ${path.relative(srcRoot, file)} (${LAYER_ORDER[fromLayer]}) -> imports higher layer ${LAYER_ORDER[toLayer]} (${spec})`,
      );
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\nLayer check failed with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log('✓ Architecture Spine L0–L5 layer check passed (0 upward imports).');
}
