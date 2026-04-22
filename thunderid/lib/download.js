'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const THUNDER_REPO = 'asgardeo/thunder';

const PLATFORM_MAP = { darwin: 'macos', linux: 'linux', win32: 'win' };
const ARCH_MAP = { x64: 'x64', arm64: 'arm64' };

function getPlatformAsset(version) {
  const platform = PLATFORM_MAP[process.platform];
  const arch = ARCH_MAP[process.arch];
  if (!platform || !arch) {
    throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`);
  }
  return `thunder-${version}-${platform}-${arch}.zip`;
}

function fetchWithRedirects(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'thunderid-npx' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchWithRedirects(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function downloadFile(url, destPath, onProgress) {
  const res = await fetchWithRedirects(url);
  const total = parseInt(res.headers['content-length'] || '0', 10);
  let received = 0;

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    res.on('data', (chunk) => {
      received += chunk.length;
      if (total && onProgress) {
        onProgress(received, total);
      }
    });
    res.pipe(file);
    file.on('finish', () => file.close(resolve));
    file.on('error', reject);
    res.on('error', reject);
  });
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: 'pipe' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'pipe' });
  }
}

async function downloadAndExtract(version, destDir, onStatus) {
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

  try { fs.unlinkSync(zipPath); } catch {}
}

module.exports = { downloadAndExtract, getPlatformAsset };
