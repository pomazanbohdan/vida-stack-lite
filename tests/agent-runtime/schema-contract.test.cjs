'use strict';
// Focused deterministic contract validator: every receipt schema must have a
// fixed discriminator, exact required bindings and closed properties. This
// deliberately avoids a package dependency while testing schema/runtime shape.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../../agent-runtime/schemas');
for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.schema.json'))) {
  const schema = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  assert.strictEqual(schema.type, 'object', `${name} object schema`);
  assert.ok(Array.isArray(schema.required) && schema.required.includes('schema'), `${name} schema discriminator`);
  assert.ok(schema.properties && schema.properties.schema, `${name} schema property`);
  assert.ok(schema.properties.schema.const, `${name} fixed discriminator`);
}
for (const name of ['delivery-receipt.v2.schema.json','deployment-manifest.v1.schema.json','evidence.v1.schema.json','runtime-receipt.v2.schema.json','reverse-validation-receipt.v1.schema.json','recovery-evidence.v1.schema.json','import-attribution.v1.schema.json']) {
  const schema=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  for(const field of ['work_id','source_revision','sealed_revision','implementation_fingerprint','acceptance_manifest_id','acceptance_manifest_version']) assert.ok(schema.required.includes(field),`${name} binding ${field}`);
  assert.strictEqual(schema.additionalProperties,false,`${name} closed schema`);
}
const delivery = JSON.parse(fs.readFileSync(path.join(dir, 'delivery-receipt.v2.schema.json'), 'utf8'));
for (const field of ['delivery_cycle_id','deployment_manifest']) assert.ok(delivery.required.includes(field), `delivery binding ${field}`);
const legacy = JSON.parse(fs.readFileSync(path.join(dir, 'legacy-import-receipt.v1.schema.json'), 'utf8'));
for (const field of legacy.required) assert.ok(['schema', 'mode', 'source_root', 'records', 'inventory', 'assertions'].includes(field), `legacy required ${field}`);
assert.strictEqual(legacy.properties.cache.properties.policy.const, 'derived_non_authoritative', 'legacy cache cannot claim authority');
assert.strictEqual(legacy.properties.inventory.properties.time_budget_ms.maximum, 2000, 'legacy import processing budget remains below wall acceptance');
console.log('schema contract: pass');
