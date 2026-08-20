/* Bounded, fail-closed skill updater. It never edits generated marketplace copies. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function fail(message) { const error = /** @type {Error & {code?: string}} */ (new Error(message)); error.code = 'GAP-SKILL-UPDATE-001'; throw error; }
function safeSkillPath(root, value) { const file = path.resolve(root, value); const base = path.resolve(root, '.codex', 'skills'); if (!(file === base || file.startsWith(`${base}${path.sep}`)) || !file.endsWith(`${path.sep}SKILL.md`)) fail('skill update path outside source skills'); return file; }
function validateProposal(proposal) { if (!proposal || proposal.schema !== 'SkillChangeProposal/v1') fail('skill change proposal invalid'); for (const key of ['proposal_id','skill_id','skill_path','source_url','source_hash','rule','eval_manifest']) if (typeof proposal[key] !== 'string' || !proposal[key].trim()) fail(`skill proposal ${key} missing`); if (!/^[a-f0-9]{64}$/.test(proposal.source_hash)) fail('skill proposal source hash invalid'); if (!Array.isArray(proposal.evidence_pointers) || !proposal.evidence_pointers.length) fail('skill proposal evidence missing'); if (proposal.status !== 'proposed') fail('skill proposal must be proposed'); return proposal; }
function apply(root, proposal, checks = []) {
  validateProposal(proposal);
  if (!checks.length || checks.some(check => check.status !== 'pass')) fail('skill update quality/eval checks incomplete');
  const file = safeSkillPath(root, proposal.skill_path);
  const before = hash(file); if (before !== proposal.source_hash) fail('skill source hash changed');
  const original = fs.readFileSync(file, 'utf8');
  const baseline = /(^## Official Academy Baseline\r?\n)([\s\S]*?)(?=^## |$)/m;
  const section = `## Official Academy Baseline\n\n- Source: ${proposal.source_url}\n- Rule: ${proposal.rule}\n`;
  const next = baseline.test(original) ? original.replace(baseline, section) : `${original.trimEnd()}\n\n${section}`;
  fs.writeFileSync(file, next, 'utf8');
  const generated = hash(file);
  return { schema: 'SkillUpdateResult/v1', update_id: `${proposal.proposal_id}-result`, proposal_id: proposal.proposal_id, skill_id: proposal.skill_id, status: 'applied', source_hash: before, generated_hash: generated, checks, evidence_pointers: proposal.evidence_pointers, updated_at: new Date().toISOString(), next_action: 'Run marketplace sync and skill quality/eval gates; do not edit generated copies.' };
}
module.exports = { hash, validateProposal, apply };
