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
const TEXT_FILE_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.txt', '.svg', '.map']);
const ALLOWED_EXTERNAL_URLS = new Set([PLAYABLES_SDK]);
const KNOWN_HARMLESS_URL_PREFIXES = [
  'http://prunegames.com',
  'http://steffe.se',
  'http://www.w3.org/',
  'https://github.com/niklasvh/base64-arraybuffer',
  'https://phaser.io',
  'https://github.com/phaserjs/phaser',
  'https://github.com/photonstorm/phaser',
  'https://opensource.org/',
  'https://github.com/vitejs/vite',
  'https://developer.mozilla.org/',
  'https://www.w3.org/',
];
const NETWORK_API_PATTERNS = [
  { name: 'fetch', pattern: /\bfetch\s*\(/g },
  { name: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/g },
  { name: 'WebSocket', pattern: /\bWebSocket\s*\(/g },
  { name: 'EventSource', pattern: /\bEventSource\s*\(/g },
  { name: 'sendBeacon', pattern: /\bnavigator\.sendBeacon\s*\(/g },
];

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
const externalRefs = collectExternalRefs(html).filter((ref) => !ALLOWED_EXTERNAL_URLS.has(ref));
const textFileReports = await scanTextFiles(stats.map((item) => item.file));
const discoveredExternalUrls = unique(textFileReports.flatMap((item) => item.urls));
const allowedExternalUrls = discoveredExternalUrls.filter((url) => ALLOWED_EXTERNAL_URLS.has(url));
const frameworkExternalUrls = discoveredExternalUrls.filter((url) => isKnownHarmlessUrl(url));
const prohibitedExternalUrls = discoveredExternalUrls.filter(
  (url) => !ALLOWED_EXTERNAL_URLS.has(url) && !isKnownHarmlessUrl(url),
);
const networkApiMatches = textFileReports.flatMap((item) =>
  item.networkMatches.map((match) => ({
    file: path.relative(DIST_DIR, item.file),
    pattern: match.pattern,
    count: match.count,
  })),
);
const saveFixture = {
  version: 1,
  bestScore: 999999,
  coins: 999999,
  permanentUpgrades: { damage: 20, health: 20, speed: 15 },
  unlockedStageIds: ['stage-1', 'stage-2'],
  clearedStageIds: ['stage-1'],
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
  failures.push(`unexpected index external refs: ${externalRefs.join(', ')}`);
}
if (prohibitedExternalUrls.length > 0) {
  failures.push(`prohibited external urls in bundle: ${prohibitedExternalUrls.join(', ')}`);
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
  scannedTextFiles: textFileReports.map((item) => path.relative(DIST_DIR, item.file)),
  discoveredExternalUrls,
  allowedExternalUrls,
  frameworkExternalUrls,
  prohibitedExternalUrls,
  unexpectedExternalRefs: externalRefs,
  networkApiMatches,
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

async function scanTextFiles(filePaths) {
  const textFiles = filePaths.filter((file) => TEXT_FILE_EXTENSIONS.has(path.extname(file)));
  return Promise.all(
    textFiles.map(async (file) => {
      const text = await readFile(file, 'utf8');
      return {
        file,
        urls: collectUrls(text),
        networkMatches: collectNetworkApiMatches(text),
      };
    }),
  );
}

function collectUrls(text) {
  const urls = [];
  const pattern = /https?:\/\/[^\s"'`<>\\)]+/g;
  let match = pattern.exec(text);
  while (match) {
    urls.push(normalizeUrl(match[0]));
    match = pattern.exec(text);
  }
  return unique(urls);
}

function collectNetworkApiMatches(text) {
  return NETWORK_API_PATTERNS.flatMap(({ name, pattern }) => {
    const matches = text.match(pattern);
    return matches ? [{ pattern: name, count: matches.length }] : [];
  });
}

function isKnownHarmlessUrl(url) {
  return KNOWN_HARMLESS_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function normalizeUrl(url) {
  return url.replace(/[|.,;:]+$/u, '').replace(/\|MIT$/u, '');
}

function unique(values) {
  return [...new Set(values)].sort();
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
