#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const assurance = require('../lib/review-assurance.cjs');
const bundle = require('../lib/verify-bundle.cjs');

function fail(message) { const error = new Error(message); error.code = 'GATE_BLOCKED'; throw error; }
function argValue(argv, name, fallback) { const index = argv.indexOf(name); return index < 0 ? fallback : argv[index + 1]; }
function parseArgs(argv) {
  const output = argValue(argv, '--output', 'summary');
  if (!['summary', 'evidence', 'full'].includes(output)) fail('output mode invalid');
  const maxEvidenceLines = Number(argValue(argv, '--max-evidence-lines', '50'));
  const maxOutputTokens = Number(argValue(argv, '--max-output-tokens', '0'));
  const maxParallel = Number(argValue(argv, '--max-parallel', '0'));
  const timeoutMs = Number(argValue(argv, '--timeout-ms', '0'));
  if (!Number.isInteger(maxEvidenceLines) || maxEvidenceLines < 1) fail('max evidence lines invalid');
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 0) fail('max output tokens invalid');
  if (!Number.isInteger(maxParallel) || maxParallel < 0 || maxParallel > 16) fail('max parallel invalid');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 3600000) fail('check timeout invalid');
  return { manifest: argValue(argv, '--manifest'), output, maxEvidenceLines, maxOutputTokens, maxParallel: maxParallel || undefined, timeoutMs: timeoutMs || undefined };
}

function readManifest(file) {
  return bundle.readManifest(file);
}

function commandSpec(spec, root) {
  return bundle.commandSpec(spec, root);
}

function appendPreview(current, chunk, maxChars) {
  if (current.length >= maxChars) return current;
  return current + chunk.toString().slice(0, maxChars - current.length);
}

function runCheck(spec, index, artifactDir, options = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    const timeoutMs = options.timeoutMs || 300000;
    const previewChars = options.previewChars || 12000;
    let artifactStream = null;
    let settled = false;
    let timedOut = false;
    let stdout = '';
    let stderr = '';
    let artifactError = null;
    const artifact = artifactDir ? path.join(artifactDir, `${String(index + 1).padStart(2, '0')}-${spec.id}.log`) : null;
    if (artifact) {
      fs.mkdirSync(artifactDir, { recursive: true });
      artifactStream = fs.createWriteStream(artifact, { encoding: 'utf8' });
      artifactStream.on('error', error => { artifactError = error; });
    }
    const write = chunk => { if (artifactStream) artifactStream.write(chunk); };
    const finish = (code, errorMessage) => {
      if (settled) return;
      settled = true;
      let completed = false;
      const complete = streamError => {
        if (completed) return;
        completed = true;
        const finalError = errorMessage || streamError;
        const failed = timedOut || finalError || code !== 0;
        const result = {
          id: spec.id,
          status: failed ? 'fail' : 'pass',
          code: timedOut ? null : code,
          duration_ms: Date.now() - started,
          stdout: assurance.redact(stdout).slice(0, previewChars),
          stderr: assurance.redact(stderr).slice(0, previewChars)
        };
        if (finalError) result.error = assurance.redact(finalError).slice(0, 500);
        if (artifact) result.artifact = path.relative(process.cwd(), artifact).replaceAll(path.sep, '/');
        resolve(result);
      };
      if (artifactStream) {
        const stream = artifactStream;
        artifactStream = null;
        if (artifactError) complete(artifactError.message);
        stream.once('error', error => complete(error.message));
        stream.once('close', () => complete(null));
        stream.end();
      } else complete(null);
    };
    let child;
    try { child = spawn(spec.command, spec.args, { cwd: spec.cwd, shell: false, windowsHide: true }); }
    catch (error) { finish(null, error.message); return; }
    const timer = setTimeout(() => { timedOut = true; try { child.kill(); } catch { /* child already exited */ } finish(null, `check timeout after ${timeoutMs}ms`); }, timeoutMs);
    child.stdout?.on('data', chunk => { write(chunk); stdout = appendPreview(stdout, chunk, previewChars); });
    child.stderr?.on('data', chunk => { write(chunk); stderr = appendPreview(stderr, chunk, previewChars); });
    child.on('error', error => { clearTimeout(timer); finish(null, error.message); });
    child.on('close', code => { clearTimeout(timer); finish(code, null); });
  });
}

async function runLimited(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function consume() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

async function runScheduled(checks, limit, worker) {
  const results = new Array(checks.length);
  let parallel = [];
  const flush = async () => {
    if (!parallel.length) return;
    const batch = parallel;
    parallel = [];
    const values = await runLimited(batch, limit, item => worker(item.spec, item.index));
    values.forEach((value, index) => { results[batch[index].index] = value; });
  };
  for (const [index, spec] of checks.entries()) {
    if (spec.serial) {
      await flush();
      results[index] = await worker(spec, index);
    } else {
      parallel.push({ spec, index });
    }
  }
  await flush();
  return results;
}

async function runBundle(manifest, options = {}) {
  const normalized = bundle.isNormalizedManifest(manifest) ? manifest : bundle.normalizeManifest(manifest, manifest?.root);
  const checks = normalized.checks;
  const maxParallel = options.maxParallel || normalized.max_parallel || 2;
  const timeoutMs = options.timeoutMs || normalized.timeout_ms || 300000;
  const started = Date.now();
  const results = await runScheduled(checks, maxParallel, (spec, index) => runCheck(spec, index, normalized.artifact_dir, { timeoutMs }));
  const failed = results.filter(result => result.status !== 'pass');
  const artifacts = results.map(result => result.artifact).filter(Boolean);
  const summary = assurance.executionSummary({ status: failed.length ? 'fail' : 'pass', passed: results.length - failed.length, failed: failed.length, duration_ms: Date.now() - started, preflight: 'not_run', reviewers: { requested: 0, started: 0, completed: 0, cancelled: 0 }, artifacts, next_action: failed.length ? 'Inspect bounded check artifacts and start correction.' : 'Record review preflight.' });
  const findings = results.map(result => ({ id: result.id, status: result.status, code: result.code, duration_ms: result.duration_ms, error: result.error }));
  const evidence = options.output && options.output !== 'summary' ? assurance.limitedLines(results.map(result => `${result.id}: ${result.status}\n${result.error || result.stderr}`).join('\n'), options.maxEvidenceLines || 50) : '';
  const logs = options.output && options.output !== 'summary' ? assurance.limitedLines(results.map(result => `${result.id}\n${result.stdout}\n${result.stderr}`).join('\n'), options.maxLogLines || 200) : '';
  return { summary, findings, evidence, logs, artifacts };
}

async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    const manifest = readManifest(options.manifest);
    const result = await runBundle(manifest, options);
    process.stdout.write(`${assurance.formatOutput(result, options.output, options)}\n`);
    if (result.summary.status !== 'pass') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.code || 'ERROR'}: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();
module.exports = { parseArgs, readManifest, commandSpec, runCheck, runBundle, runLimited, runScheduled, main };
