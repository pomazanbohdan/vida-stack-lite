'use strict';
const fs = require('fs');
const path = require('path');
const updater = require('../lib/skill-updater.cjs');

function args(argv) { const out = {}; for (let i = 0; i < argv.length; i += 1) { if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; } return out; }
function main(argv = process.argv.slice(2)) {
  const a = args(argv), root = path.resolve(a['repo-root'] || process.cwd());
  if (!a.proposal) throw new Error('--proposal JSON is required');
  const proposal = JSON.parse(fs.readFileSync(path.resolve(root, a.proposal), 'utf8'));
  const checks = a.checks ? JSON.parse(fs.readFileSync(path.resolve(root, a.checks), 'utf8')) : [];
  if (a.apply !== true) { updater.validateProposal(proposal); process.stdout.write(`${JSON.stringify({ status: 'proposed', proposal_id: proposal.proposal_id, next_action: 'Run all quality/eval/marketplace checks and rerun with --apply.' })}\n`); return; }
  const result = updater.apply(root, proposal, checks); process.stdout.write(`${JSON.stringify(result)}\n`);
}
try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
