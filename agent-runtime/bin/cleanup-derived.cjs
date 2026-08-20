#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const runtime = require('../lib/runtime.cjs');
const assurance = require('../lib/review-assurance.cjs');

function fail(message) { const error = new Error(message); error.code = 'GATE_BLOCKED'; throw error; }
function argValue(argv, name, fallback) { const index = argv.indexOf(name); return index < 0 ? fallback : argv[index + 1]; }
function parseArgs(argv) {
  const days = Number(argValue(argv, '--days', '7'));
  if (!Number.isInteger(days) || days < 1) fail('retention days invalid');
  return { root: runtime.trustedRepoRoot(argValue(argv, '--root', process.cwd())), days, apply: argv.includes('--apply') };
}
function walk(root, relative = '') {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) fail(`derived reparse point is not allowed: ${relative}`);
  if (stat.isFile()) return [{ path: relative.replaceAll(path.sep, '/'), modified_at: stat.mtime.toISOString(), absolute }];
  return fs.readdirSync(absolute).flatMap(name => walk(root, path.join(relative, name)));
}
function plan(root, days) {
  const entries = assurance.derivedRoots.flatMap(relative => walk(root, relative));
  return assurance.retentionPlan(entries, Date.now(), days * 24 * 60 * 60 * 1000).map(item => ({ ...item, absolute: path.resolve(root, item.path) }));
}
function run(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    const candidates = plan(options.root, options.days);
    if (options.apply) candidates.forEach(item => fs.rmSync(item.absolute, { force: true }));
    process.stdout.write(`${JSON.stringify({ mode: options.apply ? 'apply' : 'dry-run', days: options.days, candidates: candidates.map(item => item.path) })}\n`);
  } catch (error) {
    process.stderr.write(`${error.code || 'ERROR'}: ${error.message}\n`);
    process.exitCode = 2;
  }
}
if (require.main === module) run();
module.exports = { parseArgs, walk, plan, run };
