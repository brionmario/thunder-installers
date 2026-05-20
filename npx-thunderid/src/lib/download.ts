import { execSync } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import type { IncomingMessage } from 'http';

const THUNDER_REPO = 'thunder-id/thunderid';

const PLATFORM_MAP: Record<string, string> = { darwin: 'macos', linux: 'linux', win32: 'win' };
const ARCH_MAP: Record<string, string> = { x64: 'x64', arm64: 'arm64' };

export function getPlatformAsset(version: string): string {
  const platform = PLATFORM_MAP[process.platform];
  const arch = ARCH_MAP[process.arch];
  if (!platform || !arch) {
    throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`);
  }
  return `thunderid-${version}-${platform}-${arch}.zip`;
}

function fetchWithRedirects(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'thunderid-npx' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchWithRedirects(res.headers.location as string).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (received: number, total: number) => void,
): Promise<void> {
  const res = await fetchWithRedirects(url);
  const total = parseInt(res.headers['content-length'] ?? '0', 10);
  let received = 0;

  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    res.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (total && onProgress) {
        onProgress(received, total);
      }
    });
    res.pipe(file);
    file.on('finish', () => file.close(() => resolve()));
    file.on('error', reject);
    res.on('error', reject);
  });
}

function extractZip(zipPath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: 'pipe' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'pipe' });
  }
}

export async function downloadAndExtract(
  version: string,
  destDir: string,
  onStatus?: (msg: string) => void,
): Promise<void> {
  const assetName = getPlatformAsset(version);
  const url = `https://github.com/${THUNDER_REPO}/releases/download/v${version}/${assetName}`;
  const zipPath = path.join(os.tmpdir(), assetName);

  onStatus?.(`Downloading Thunder v${version} for ${process.platform}/${process.arch}`);
  await downloadFile(url, zipPath, (received, total) => {
    const pct = Math.round((received / total) * 100);
    onStatus?.(`Downloading Thunder v${version} — ${pct}%`);
  });

  onStatus?.('Extracting...');
  extractZip(zipPath, destDir);

  try { fs.unlinkSync(zipPath); } catch { /* ignore */ }
}

export function getLatestThunderVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${THUNDER_REPO}/releases/latest`;
    https.get(url, { headers: { 'User-Agent': 'thunderid-npx' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return getLatestThunderVersion().then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching latest Thunder release`));
      }
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          const tag = (JSON.parse(body) as { tag_name?: string }).tag_name;
          if (!tag) throw new Error('tag_name missing from GitHub release response');
          resolve(tag.replace(/^v/, ''));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}
