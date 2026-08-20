'use strict';
const fs = require('fs');
const path = require('path');
const resolver = require('../lib/platform-knowledge-resolver.cjs');

function args(argv) { const out = {}; for (let i = 0; i < argv.length; i += 1) { if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; } return out; }
function main(argv = process.argv.slice(2)) {
  const a = args(argv), root = path.resolve(a['repo-root'] || process.cwd());
  if (!a.input) throw new Error('--input JSON descriptor is required');
  const descriptor = JSON.parse(fs.readFileSync(path.resolve(root, a.input), 'utf8'));
  const context = resolver.resolve(root, descriptor);
  const payload = `${JSON.stringify(context, null, 2)}\n`;
  if (a.output) { const target = path.resolve(root, a.output); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, payload, 'utf8'); }
  process.stdout.write(`${JSON.stringify({ status: 'pass', context_id: context.context_id, digest: context.digest, skills: context.skills.length, official_sources: context.official_sources.length, warnings: context.warnings.length, output: a.output || null })}\n`);
}
try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
