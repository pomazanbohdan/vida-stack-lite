'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const legacy = require('../../lib/legacy-import.cjs');

describe('preservation-only legacy import: ZOMBIES and malformed evidence', () => {
  test('zero root is stable and contains no authority', () => {
    const missing = path.join(os.tmpdir(), `legacy-missing-${Date.now()}`);
    const receipt = legacy.importLegacy(missing);
    expect(receipt.records).toEqual([]);
    expect(receipt.assertions).toMatchObject({ historical_non_authoritative: true, does_not_consume_approvals: true, does_not_consume_leases: true, static_is_not_runtime: true });
  });

  test('one/many nested JSON records preserve all classes and isolate malformed input', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-zombies-'));
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'bad.json'), '{bad');
    fs.writeFileSync(path.join(root, 'ignored.txt'), '{}');
    fs.writeFileSync(path.join(root, 'nested', 'runtime.json'), JSON.stringify({
      protocol_id: 'old', version: 4, state: 'runtime_failed', approved: 'legacy', lease: { who: 'old' }, open_gaps: 'GAP-OLD', results: [
        { kind: 'runtime', pointer: 'runtime-log' }, { evidence_type: 'test', id: 'test-1' }, { layer: 'code', path: 'src/x' }, { class: 'other', pointer: 'decision' }
      ]
    }));
    const receipt = legacy.importLegacy(root);
    expect(receipt.records.map(x => x.pointer)).toEqual(['bad.json', 'nested/runtime.json']);
    expect(receipt.records[0]).toMatchObject({ parse_error: expect.any(String), historical: true, non_authoritative: true });
    const record = receipt.records[1];
    expect(record).toMatchObject({ schema: 'old', version: 4, id: null, runtime: { status: 'runtime_failed', historical: true } });
    expect(record.evidence.map(x => x.class)).toEqual(['Runtime', 'Static', 'Code', 'Decision']);
    expect(record.gaps).toEqual(['GAP-OLD']);
    expect(record.leases).toEqual([{ who: 'old' }]);
  });

  test('CLI seam requires a root and writes only the read-only projection', () => {
    expect(() => legacy.runCli([], () => true)).toThrow(/Usage/);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-cli-'));
    fs.writeFileSync(path.join(root, 'state.json'), JSON.stringify({ status: 'ready_for_decision' }));
    const output = [];
    legacy.runCli([root], value => { output.push(value); return true; });
    const receipt = JSON.parse(output.join(''));
    expect(receipt).toMatchObject({ mode: 'read_only', assertions: { does_not_consume_approvals: true, does_not_consume_leases: true } });
    expect(receipt.records).toHaveLength(1);
    const originalWrite = process.stdout.write; process.stdout.write = () => true;
    try { legacy.runCli([root]); } finally { process.stdout.write = originalWrite; }
  });

});
