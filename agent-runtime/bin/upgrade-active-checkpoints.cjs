'use strict';

const path = require('path');
const runtime = require('../lib/runtime.cjs');

function option(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : argv[index + 1] || fallback;
}

function main(argv = process.argv.slice(2)) {
  const root = path.resolve(option(argv, '--root', process.cwd()));
  const report = runtime.upgradeActiveCheckpoints(root, {
    apply: argv.includes('--apply'),
    workId: option(argv, '--work-id', undefined),
    targetProtocol: option(argv, '--target-protocol', 'auto'),
    requirePlatformKnowledge: argv.includes('--require-platform-knowledge'),
    actor: option(argv, '--actor', 'runtime:checkpoint-upgrader'),
    reason: option(argv, '--reason', 'Align the active checkpoint with the current runtime protocol.'),
    pointer: option(argv, '--pointer', '.agent/work#protocol-upgrade'),
    timestamp: option(argv, '--timestamp', new Date().toISOString())
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.counts.blocked) process.exitCode = 1;
  return report;
}

if (require.main === module) main();
module.exports = { main };
