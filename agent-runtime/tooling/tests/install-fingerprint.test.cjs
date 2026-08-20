'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const installer = require('../install-fingerprint.cjs');

function tempTooling() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-install-fingerprint-'));
  fs.mkdirSync(path.join(root, 'node_modules', '.bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"test-tooling"}');
  fs.writeFileSync(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}');
  for (const name of ['vitest', 'tsc', 'stryker']) fs.writeFileSync(path.join(root, 'node_modules', '.bin', name), '');
  return root;
}

describe('tooling install fingerprint', () => {
  test('requires the pinned lock/package inputs and installed binaries', () => {
    const root = tempTooling();
    const marker = path.join(root, 'marker.json');
    expect(installer.isFresh(root, marker)).toBe(false);
    const first = installer.writeMarker(root, marker);
    expect(first.fingerprint).toHaveLength(64);
    expect(installer.isFresh(root, marker)).toBe(true);
    fs.appendFileSync(path.join(root, 'package-lock.json'), '\n');
    expect(installer.isFresh(root, marker)).toBe(false);
  });

  test('invalidates when a required executable disappears', () => {
    const root = tempTooling();
    const marker = path.join(root, 'marker.json');
    installer.writeMarker(root, marker);
    fs.rmSync(path.join(root, 'node_modules', '.bin', 'stryker'));
    expect(installer.binsAvailable(root)).toBe(false);
    expect(installer.isFresh(root, marker)).toBe(false);
  });
});
