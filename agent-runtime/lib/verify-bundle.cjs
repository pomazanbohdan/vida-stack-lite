/* Shared host-side VerifyBundle/v1 manifest validation. */
'use strict';

const fs = require('fs');
const path = require('path');
const normalizedManifestBrand = Symbol('verify-bundle-normalized');

function fail(message) {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = 'GATE_BLOCKED';
  throw error;
}

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`);
  return value;
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function noReparse(target, root) {
  let cursor = root;
  const relative = path.relative(root, target);
  for (const part of relative ? relative.split(path.sep) : []) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) fail(`bundle path reparse point: ${path.relative(root, cursor)}`);
  }
}

function relativePath(value, name) {
  requiredString(value, name);
  if (path.isAbsolute(value) || value.split(/[\\/]/).some(part => !part || part === '.' || part === '..')) fail(`${name} unsafe`);
  return value;
}

function validateCommandProperties(spec) {
  if (Object.keys(spec).some(key => !['id', 'command', 'args', 'cwd', 'serial'].includes(key))) fail('bundle check property invalid');
  for (const key of ['id', 'command']) requiredString(spec[key], `bundle check ${key}`);
  if (spec.args !== undefined && (!Array.isArray(spec.args) || !spec.args.every(value => typeof value === 'string'))) fail('bundle check args invalid');
}

function resolveCwd(spec, root) {
  if (spec.cwd === undefined) return root;
  return path.isAbsolute(spec.cwd) ? path.resolve(spec.cwd) : path.resolve(root, relativePath(spec.cwd, 'bundle check cwd'));
}

function commandSpec(spec, root) {
  if (!spec || typeof spec !== 'object') fail('bundle check invalid');
  validateCommandProperties(spec);
  const cwd = resolveCwd(spec, root);
  if (!inside(root, cwd) || !fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) fail('bundle check cwd outside manifest root');
  noReparse(cwd, root);
  return { id: spec.id, command: spec.command, args: spec.args || [], cwd, serial: spec.serial === true };
}

function positiveInteger(value, name, fallback, maximum) {
  const result = value === undefined ? fallback : value;
  if (!Number.isInteger(result) || result < 1 || result > maximum) fail(`${name} invalid`);
  return result;
}

function parseManifest(absolute) {
  try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch { fail('bundle manifest invalid'); }
}

function validateManifestShape(manifest) {
  if (!manifest || manifest.schema !== 'VerifyBundle/v1' || !Array.isArray(manifest.checks) || !manifest.checks.length || Object.keys(manifest).some(key => !['schema', 'artifact_dir', 'max_parallel', 'timeout_ms', 'checks'].includes(key))) fail('bundle manifest invalid');
}

function validateChecks(values, root) {
  const ids = new Set();
  return values.map(spec => {
    const value = commandSpec(spec, root);
    if (ids.has(value.id)) fail(`bundle check duplicate id: ${value.id}`);
    ids.add(value.id);
    return value;
  });
}

function resolveArtifactDir(manifest, root) {
  if (manifest.artifact_dir === undefined) return null;
  const artifactDir = path.resolve(root, relativePath(manifest.artifact_dir, 'artifact directory'));
  noReparse(artifactDir, root);
  return artifactDir;
}

function normalizeManifest(manifest, root) {
  validateManifestShape(manifest);
  const absoluteRoot = path.resolve(requiredString(root, 'bundle manifest root'));
  if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) fail('bundle manifest root invalid');
  noReparse(absoluteRoot, absoluteRoot);
  const checks = validateChecks(manifest.checks, absoluteRoot).map(spec => Object.freeze({
    ...spec,
    args: Object.freeze([...spec.args])
  }));
  const artifactDir = resolveArtifactDir(manifest, absoluteRoot);
  const frozenChecks = Object.freeze(checks);
  const normalized = {
    schema: manifest.schema,
    checks: frozenChecks,
    root: absoluteRoot,
    artifact_dir: artifactDir,
    max_parallel: positiveInteger(manifest.max_parallel, 'max parallel', 2, 16),
    timeout_ms: positiveInteger(manifest.timeout_ms, 'check timeout', 300000, 3600000)
  };
  Object.defineProperty(normalized, normalizedManifestBrand, { value: true, enumerable: false });
  return Object.freeze(normalized);
}

function readManifest(file) {
  if (!file) fail('bundle manifest required');
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) fail('bundle manifest unavailable');
  const root = path.dirname(absolute);
  noReparse(absolute, root);
  const manifest = parseManifest(absolute);
  return normalizeManifest(manifest, root);
}

function isNormalizedManifest(value) { return Boolean(value && value[normalizedManifestBrand] === true); }

module.exports = { readManifest, normalizeManifest, isNormalizedManifest, commandSpec, relativePath };
