'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const toolingRoot = __dirname;
const repositoryRoot = path.resolve(toolingRoot, '..', '..');
const markerPath = path.join(repositoryRoot, '.planning', 'agent-flow', 'test-output', 'install', 'tooling-install-fingerprint.json');
const requiredBins = ['vitest', 'tsc', 'stryker'];

function fail(message) {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = 'GAP-RUNTIME-TOOLING-INSTALL-001';
  throw error;
}

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function sourceFingerprint(root = toolingRoot) {
  const packageFile = path.join(root, 'package.json');
  const lockFile = path.join(root, 'package-lock.json');
  const packageText = fs.readFileSync(packageFile, 'utf8');
  const lockText = fs.readFileSync(lockFile, 'utf8');
  return sha256(JSON.stringify({ package: packageText, lock: lockText, node: process.version, platform: process.platform, arch: process.arch }));
}

function binsAvailable(root = toolingRoot) {
  return requiredBins.every(name => fs.existsSync(path.join(root, 'node_modules', '.bin', name)) || fs.existsSync(path.join(root, 'node_modules', '.bin', `${name}.cmd`)));
}

function readMarker(file = markerPath) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function isFresh(root = toolingRoot, file = markerPath) {
  const marker = readMarker(file);
  return Boolean(marker && marker.schema === 'ToolingInstallFingerprint/v1' && marker.fingerprint === sourceFingerprint(root) && binsAvailable(root));
}

function writeMarker(root = toolingRoot, file = markerPath) {
  const value = { schema: 'ToolingInstallFingerprint/v1', fingerprint: sourceFingerprint(root), node: process.version, platform: process.platform, arch: process.arch, recorded_at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
  return value;
}

function ensureInstalled(root = toolingRoot, file = markerPath) {
  if (process.env.AGENT_RUNTIME_FORCE_CI !== '1' && isFresh(root, file)) {
    return { status: 'cache-hit', fingerprint: readMarker(file).fingerprint, marker: file };
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  process.stdout.write('tooling install cache miss; running npm ci\n');
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : npm;
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', `${npm} ci`] : ['ci'];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true
  });
  if (result.error) {
    /** @type {Error & { code?: string }} */
    const error = result.error;
    fail(`npm ci could not start: ${error.code || error.message}`);
  }
  if (result.status !== 0) fail(`npm ci failed with status ${result.status}`);
  const marker = writeMarker(root, file);
  return { status: 'installed', fingerprint: marker.fingerprint, marker: file };
}

if (require.main === module) {
  try {
    const result = ensureInstalled();
    process.stdout.write(`tooling install ${result.status}\n`);
  } catch (caught) {
    /** @type {Error & { code?: string }} */
    const error = caught;
    process.stderr.write(`${error.code || 'ERROR'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { binsAvailable, ensureInstalled, isFresh, readMarker, sourceFingerprint, writeMarker };
