import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
const MAX_INITIAL_BYTES = 30 * 1024 * 1024;
const RECOMMENDED_INITIAL_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const RECOMMENDED_FILE_BYTES = 512 * 1024;
const MAX_FILE_COUNT = 8000;
const MAX_SAVE_BYTES = 3 * 1024 * 1024;
const VALID_FILENAME = /^[A-Za-z0-9_.-]+$/;
const PLAYABLES_SDK = 'https://www.youtube.com/game_api/v1';

const files = await listFiles(DIST_DIR);
const stats = await Promise.all(files.map(async (file) => ({ file, size: (await stat(file)).size })));
const totalBytes = stats.reduce((sum, item) => sum + item.size, 0);
const largest = stats.reduce((current, item) => (item.size > current.size ? item : current), stats[0]);
const invalidFilenames = stats
  .map((item) => path.relative(DIST_DIR, item.file))
  .filter((relative) => relative.split(path.sep).some((segment) => !VALID_FILENAME.test(segment)));
const oversizedFiles = stats.filter((item) => item.size >= MAX_FILE_BYTES);
const overRecommendedFiles = stats.filter((item) => item.size >= RECOMMENDED_FILE_BYTES);
const html = await readFile(INDEX_PATH, 'utf8');
const sdkIndex = html.indexOf(PLAYABLES_SDK);
const moduleIndex = html.indexOf('type="module"');
const absoluteBundleRefs = collectAbsoluteBundleRefs(html);
const externalRefs = collectExternalRefs(html).filter((ref) => ref !== PLAYABLES_SDK);
const saveFixture = {
  version: 1,
  bestScore: 999999,
  coins: 999999,
  permanentUpgrades: { damage: 20, health: 20, speed: 15 },
};
const saveBytes = new TextEncoder().encode(JSON.stringify(saveFixture)).length;
const failures = [];

if (files.length > MAX_FILE_COUNT) {
  failures.push(`file count ${files.length} exceeds ${MAX_FILE_COUNT}`);
}
if (totalBytes >= MAX_TOTAL_BYTES) {
  failures.push(`total size ${totalBytes} exceeds ${MAX_TOTAL_BYTES}`);
}
if (totalBytes >= MAX_INITIAL_BYTES) {
  failures.push(`initial bundle approximation ${totalBytes} exceeds ${MAX_INITIAL_BYTES}`);
}
if (oversizedFiles.length > 0) {
  failures.push(`${oversizedFiles.length} files exceed ${MAX_FILE_BYTES} bytes`);
}
if (invalidFilenames.length > 0) {
  failures.push(`invalid filenames: ${invalidFilenames.join(', ')}`);
}
if (sdkIndex < 0) {
  failures.push('Playables SDK script is missing from dist/index.html');
}
if (sdkIndex >= 0 && moduleIndex >= 0 && sdkIndex > moduleIndex) {
  failures.push('Playables SDK script appears after game module');
}
if (absoluteBundleRefs.length > 0) {
  failures.push(`absolute bundle refs: ${absoluteBundleRefs.join(', ')}`);
}
if (externalRefs.length > 0) {
  failures.push(`unexpected external refs: ${externalRefs.join(', ')}`);
}
if (saveBytes >= MAX_SAVE_BYTES) {
  failures.push(`save fixture ${saveBytes} bytes exceeds ${MAX_SAVE_BYTES}`);
}

const report = {
  fileCount: files.length,
  totalBytes,
  initialBundleApproxBytes: totalBytes,
  initialBundleRecommendedLimitBytes: RECOMMENDED_INITIAL_BYTES,
  largestFile: largest ? path.relative(DIST_DIR, largest.file) : null,
  largestFileBytes: largest?.size ?? 0,
  filesOverRecommendedSize: overRecommendedFiles.map((item) => ({
    file: path.relative(DIST_DIR, item.file),
    bytes: item.size,
    recommendedBytes: RECOMMENDED_FILE_BYTES,
  })),
  invalidFilenames,
  absoluteBundleRefs,
  unexpectedExternalRefs: externalRefs,
  sdkBeforeGameModule: sdkIndex >= 0 && moduleIndex >= 0 && sdkIndex < moduleIndex,
  saveFixtureBytes: saveBytes,
  passed: failures.length === 0,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    }),
  );
  return nested.flat();
}

function collectAbsoluteBundleRefs(htmlText) {
  const refs = [];
  const pattern = /\b(?:src|href)="([^"]+)"/g;
  let match = pattern.exec(htmlText);
  while (match) {
    const ref = match[1];
    if (ref.startsWith('/') && !ref.startsWith('//')) {
      refs.push(ref);
    }
    match = pattern.exec(htmlText);
  }
  return refs;
}

function collectExternalRefs(htmlText) {
  const refs = [];
  const pattern = /\b(?:src|href)="(https?:\/\/[^"]+)"/g;
  let match = pattern.exec(htmlText);
  while (match) {
    refs.push(match[1]);
    match = pattern.exec(htmlText);
  }
  return refs;
}
