import assert from 'node:assert/strict';
import { test } from 'bun:test';
import {
  runCloudToolWithCleanup,
  parseCloudToolLock,
  parseCloudToolReceipt,
  parseCloudMcpReply,
  appendBoundedCloudReply,
  cloudReplyBufferLimit,
  repairCloudToolProfile,
} from '../../tooling/agent/cloud-tooling-contracts.ts';

test('cloud tool cleanup preserves both failures and a raw undefined rejection', async () => {
  const body = new Error('body');
  const cleanup = new Error('cleanup');
  await assert.rejects(
    runCloudToolWithCleanup(
      async () => {
        throw body;
      },
      async () => {
        throw cleanup;
      },
    ),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [body, cleanup]);
      assert.equal(error.cause, body);
      return true;
    },
  );
  await assert.rejects(
    runCloudToolWithCleanup(
      async () => {
        throw body;
      },
      async () => {},
    ),
    (error) => error === body,
  );
  await assert.rejects(
    runCloudToolWithCleanup(
      async () => {},
      async () => {
        throw cleanup;
      },
    ),
    (error) => error === cleanup,
  );
  let rejected = false;
  try {
    await runCloudToolWithCleanup(
      async () => {
        throw undefined;
      },
      async () => {},
    );
  } catch (error) {
    rejected = true;
    assert.equal(error, undefined);
  }
  assert.equal(rejected, true);
});

test('cloud tool lock requires the reviewed tool and semantic model fields', () => {
  const lock = {
    tools: [
      {
        name: 'lean-ctx',
        version: '1.2.3',
        url: 'https://example.test/tool.tar.gz',
        sha256: 'a'.repeat(64),
        archive: 'tar',
        binaries: ['lean-ctx'],
      },
    ],
    semanticModel: { repository: 'org/model', revision: 'b'.repeat(40), files: { 'config.json': 'c'.repeat(64) } },
  };
  assert.deepEqual(parseCloudToolLock(JSON.stringify(lock)), lock);
  assert.throws(() => parseCloudToolLock('{'), /lock/i);
  assert.throws(
    () => parseCloudToolLock(JSON.stringify({ ...lock, tools: [{ ...lock.tools[0], sha256: 9 }] })),
    /lock/i,
  );
  assert.throws(() => parseCloudToolLock(JSON.stringify({ ...lock, tools: [] })), /lock/i);
  assert.throws(
    () => parseCloudToolLock(JSON.stringify({ ...lock, tools: [{ ...lock.tools[0], binaries: ['../lean-ctx'] }] })),
    /lock/i,
  );
});

test('cloud tool receipt rejects malformed or incomplete cached evidence', () => {
  assert.deepEqual(
    parseCloudToolReceipt(JSON.stringify({ archiveSha256: 'a'.repeat(64), binaries: { 'lean-ctx': 'b'.repeat(64) } })),
    {
      archiveSha256: 'a'.repeat(64),
      binaries: { 'lean-ctx': 'b'.repeat(64) },
    },
  );
  assert.equal(parseCloudToolReceipt('{'), null);
  assert.equal(parseCloudToolReceipt(JSON.stringify({ archiveSha256: 'a'.repeat(64), binaries: [] })), null);
  assert.equal(
    parseCloudToolReceipt(JSON.stringify({ archiveSha256: 'a'.repeat(64), binaries: { 'lean-ctx': 7 } })),
    null,
  );
});

test('MCP replies preserve explicit failures and reject malformed shapes', () => {
  assert.equal(parseCloudMcpReply('{"jsonrpc":"2.0","id":2,"result":{"isError":true}}').result?.isError, true);
  assert.equal(parseCloudMcpReply('{"jsonrpc":"2.0","id":2,"error":{"code":-1}}').id, 2);
  assert.throws(() => parseCloudMcpReply('{'), /MCP/i);
  assert.throws(() => parseCloudMcpReply('{"jsonrpc":"2.0","id":"2","result":[]}'), /MCP/i);
  assert.throws(() => parseCloudMcpReply('{"jsonrpc":"2.0","id":2,"result":{"instructions":7}}'), /MCP/i);
  assert.throws(
    () => parseCloudMcpReply('{"jsonrpc":"2.0","id":2,"result":{"structuredContent":{"exitCode":1.5}}}'),
    /MCP/i,
  );
  assert.throws(() => parseCloudMcpReply('{"jsonrpc":"2.0","id":2}'), /MCP/i);
});

test('cloud MCP reader accepts valid notifications without treating them as replies', () => {
  const value = parseCloudMcpReply(
    '{"jsonrpc":"2.0","method":"notifications/message","params":{"level":"info","data":"ready"}}',
  );
  assert.equal(value.id, undefined);
  assert.equal(value.result, undefined);
  assert.throws(() => parseCloudMcpReply('{"jsonrpc":"2.0","params":{}}'), /MCP/i);
});

test('cloud MCP reply buffering accepts the limit and rejects an oversized line', () => {
  assert.equal(appendBoundedCloudReply('x'.repeat(cloudReplyBufferLimit - 1), 'x').length, cloudReplyBufferLimit);
  assert.throws(() => appendBoundedCloudReply('x'.repeat(cloudReplyBufferLimit), 'x'), /buffer limit/i);
});

test('cloud MCP reply bound accepts coalesced valid lines and checks a split line', () => {
  const line = 'x'.repeat(600 * 1024);
  assert.equal(appendBoundedCloudReply('', line + '\n' + line + '\n'), line + '\n' + line + '\n');
  assert.throws(() => appendBoundedCloudReply(line, line + '\n'), /exceed|bound|large/i);
});

test('profile repair validates an intact block and repairs only a marker-only managed block', () => {
  const marker = '# vida-cloud-tooling environment';
  const sourceLine = "if [ -f '/cache/environment.sh' ]; then . '/cache/environment.sh'; fi";
  const valid = Buffer.from(`before\n${marker}\n${sourceLine}\nafter\n`);
  assert.deepEqual(repairCloudToolProfile(valid, marker, sourceLine), valid);
  const validCrLf = Buffer.from(`before\r\n${marker}\r\n${sourceLine}\r\nafter\r\n`);
  assert.deepEqual(repairCloudToolProfile(validCrLf, marker, sourceLine), validCrLf);
  const markerOnly = Buffer.from(`before\n${marker}\n`);
  assert.equal(repairCloudToolProfile(markerOnly, marker, sourceLine).toString(), `before\n${marker}\n${sourceLine}\n`);
  const markerOnlyCrLf = Buffer.from(`before\r\n${marker}\r\n`);
  assert.equal(
    repairCloudToolProfile(markerOnlyCrLf, marker, sourceLine).toString(),
    `before\r\n${marker}\r\n${sourceLine}\r\n`,
  );

  const damaged = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf, 0xff]),
    Buffer.from(`before\n${marker}\nuser-owned-next-line\n`),
  ]);
  assert.throws(() => repairCloudToolProfile(damaged, marker, sourceLine), /unowned|refusing/i);
  assert.equal(damaged.subarray(0, 4).toString('hex'), 'efbb bfff'.replace(' ', ''));
  assert.throws(
    () => repairCloudToolProfile(Buffer.from(`prefix ${marker}\n`), marker, sourceLine),
    /embedded|refusing/i,
  );
  assert.throws(
    () => repairCloudToolProfile(Buffer.from(`${marker}\n${marker}\n`), marker, sourceLine),
    /multiple|ambiguous/i,
  );
});
