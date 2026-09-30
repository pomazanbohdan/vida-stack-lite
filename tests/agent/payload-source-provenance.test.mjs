import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshAuthoredSourceBinding } from '../../build-verification-overlay.mjs';
import { verifyStagedPayloadManifest } from '../../controllers/forward-update-plan.mjs';
const stage = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = path.join(stage, 'source-provenance-fixtures');
mkdirSync(scratch, { recursive: true });
const root = mkdtempSync(path.join(scratch, 'source-'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const old = Buffer.from('old authored source\n'),
  current = Buffer.from('changed authored source\n');
const source = path.join(root, 'source.mjs');
writeFileSync(source, current);
const original = { path: 'source.mjs', size: old.length, sha256: sha(old), source_sha256: sha(old) };
const entry = refreshAuthoredSourceBinding({ ...original }, readFileSync(source), () => {
  throw Error('same-byte source cannot redirect');
});
assert.equal(entry.source_sha256, sha(readFileSync(source)));
const publish = (item) => {
  const bytes = Buffer.from(
    JSON.stringify(
      { schema: 'VidaAgentPreparedPayload/v1', files: [item], unresolved_integration_paths: [] },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(path.join(root, 'vida-agent-payload.manifest.v1.json'), bytes);
  return () => verifyStagedPayloadManifest(root, sha(bytes));
};
assert.equal(publish(entry)().files.size, 1);
assert.throws(publish({ ...entry, source_sha256: original.source_sha256 }), /same-byte source provenance differs/);
const template = Buffer.from('authoritative template\n');
const generated = refreshAuthoredSourceBinding(
  { path: 'AGENTS.md', source_path: 'vida-agent/templates/AGENTS.template.md' },
  current,
  (relative) => {
    assert.equal(relative, 'vida-agent/templates/AGENTS.template.md');
    return template;
  },
);
assert.equal(generated.source_sha256, sha(template));
assert.notEqual(generated.source_sha256, generated.sha256);
console.log(
  JSON.stringify({
    status: 'pass',
    same_byte_authored_source: true,
    stale_source_denied: true,
    generated_source_preserved: true,
    synthetic: 'TEST SETUP ONLY',
  }),
);
