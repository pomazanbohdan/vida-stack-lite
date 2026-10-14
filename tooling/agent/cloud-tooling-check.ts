/** Focused host qualification, independent of product suites and Source indexing. */
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  runCloudToolWithCleanup,
  appendBoundedCloudReply,
  parseCloudMcpReply,
  parseCloudToolLock,
  type CloudMcpReply,
} from './cloud-tooling-contracts.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bin = join(homedir(), '.local/bin');
const lock = parseCloudToolLock(await Bun.file(join(root, '.codex/cloud-tooling.lock.json')).text());
for (const tool of lock.tools) {
  const result = Bun.spawnSync([join(bin, tool.name), '--version'], { stdout: 'pipe', stderr: 'pipe' });
  const firstLine = result.stdout.toString().trim().split(/\r?\n/u)[0] ?? '';
  const version = /(?:^|\s)v?(\d+\.\d+\.\d+)(?:\s|$)/u.exec(firstLine)?.[1];
  if (result.exitCode !== 0 || version !== tool.version) {
    throw new Error(`Unqualified ${tool.name}: ${result.stderr.toString()}`);
  }
}
for (const file of ['.vex.toml', '.lean-ctx.toml', '.codex/config.toml']) {
  Bun.TOML.parse(await Bun.file(join(root, file)).text());
}
const child = Bun.spawn([join(bin, 'lean-ctx'), 'mcp'], {
  cwd: root,
  env: { ...process.env, LEAN_CTX_PROJECT_ROOT: root, LEAN_CTX_PATH_JAIL_SCOPE: 'project', LEAN_CTX_TOOL_PROFILE: '' },
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'pipe',
});
const stderr = new Response(child.stderr).text();
const pending = new Map<number, { resolve: (reply: CloudMcpReply) => void; reject: (error: Error) => void }>();
const reader = (async () => {
  let buffer = '';
  const decoder = new TextDecoder();
  try {
    for await (const chunk of child.stdout) {
      buffer = appendBoundedCloudReply(buffer, decoder.decode(chunk, { stream: true }));
      let position: number;
      while ((position = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, position);
        buffer = buffer.slice(position + 1);
        const reply = parseCloudMcpReply(line);
        if (reply.id !== undefined) {
          pending.get(reply.id)?.resolve(reply);
          pending.delete(reply.id);
        }
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) throw new Error('LeanCTX MCP closed with an unterminated reply.');
    if (pending.size) throw new Error('LeanCTX MCP closed with requests pending.');
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    for (const request of pending.values()) request.reject(error);
    pending.clear();
    child.kill();
    throw error;
  }
})();
let nextId = 1;
async function request(method: string, params: unknown = {}): Promise<CloudMcpReply> {
  const id = nextId++;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply = await new Promise<CloudMcpReply>((resolveReply, reject) => {
      pending.set(id, { resolve: resolveReply, reject });
      timer = setTimeout(() => reject(new Error(`MCP timeout: ${method}`)), 15_000);
      Promise.resolve(child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')).catch(reject);
    });
    if (reply.error || reply.result?.isError) throw new Error(JSON.stringify(reply));
    return reply;
  } finally {
    clearTimeout(timer);
    pending.delete(id);
  }
}
const textOf = (reply: CloudMcpReply) => reply.result?.content?.map((item) => item.text || '').join('\n') || '';
await runCloudToolWithCleanup(
  async () => {
    const initialized = await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'vida-cloud-tooling-check', version: '1' },
    });
    if (initialized.result?.instructions) throw new Error('LeanCTX injected competing MCP instructions.');
    await child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const listed = await request('tools/list');
    const names = listed.result?.tools?.map((tool) => tool.name).sort();
    if (JSON.stringify(names) !== JSON.stringify(['ctx_context', 'ctx_expand', 'ctx_read', 'ctx_shell'])) {
      throw new Error(`Unexpected MCP surface: ${JSON.stringify(names)}`);
    }
    const call = (name: string, args: unknown) => request('tools/call', { name, arguments: args });
    const read = await call('ctx_read', { path: 'tooling/agent/cloud-tooling-setup.ts', mode: 'map', fresh: true });
    if (!textOf(read).includes('cloud-tooling-setup.ts')) throw new Error('Explicit compact read failed.');
    const success = await call('ctx_shell', { command: 'git rev-parse --is-inside-work-tree', raw: true });
    if (textOf(success).trim() !== 'true') throw new Error('Successful command result mismatch.');
    const failed = await call('ctx_shell', { command: 'git definitely-not-a-command', raw: true });
    if (failed.result?.structuredContent?.exitCode !== 1 && !textOf(failed).includes('[exit:1]')) {
      throw new Error('Failed command lost its exit status.');
    }
    await call('ctx_shell', { command: 'git log --oneline -600' });
    const archives = await call('ctx_expand', { action: 'list' });
    const archiveId = textOf(archives).match(/^\s+([a-f0-9]{16}) \| ctx_shell \| git log --oneline -600 \|/m)?.[1];
    // Do not claim recovery merely because the listing call succeeded.
    console.log(
      JSON.stringify(
        {
          versions: lock.tools.map(({ name, version }) => ({ name, version })),
          tools: names,
          explicitRead: true,
          failedCommandStatus: 1,
          archiveListing: textOf(archives),
          archiveCandidate: archiveId || null,
        },
        null,
        2,
      ),
    );
    if (!archiveId) throw new Error('No archive ID returned; archived recovery remains unqualified.');
    const expanded = await call('ctx_expand', { action: 'retrieve', id: archiveId });
    const native = Bun.spawnSync(['git', 'log', '--oneline', '-600'], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
    if (native.exitCode !== 0 || !textOf(expanded).includes(native.stdout.toString().split('\n')[0]!)) {
      throw new Error('Archive did not recover the known Git summary.');
    }
    console.log(
      JSON.stringify({
        shellArchiveContainsFullNativeOutput: textOf(expanded).includes(native.stdout.toString().trim()),
        exactShellEvidenceOwner: 'native shell',
      }),
    );
    const fullRead = await call('ctx_read', { path: 'AGENT.sidecar.md', mode: 'full', fresh: true });
    const readArchives = await call('ctx_expand', { action: 'list' });
    const readId = textOf(readArchives).match(/^\s+([a-f0-9]{16}) \| ctx_read \| .*AGENT.sidecar.md.*$/m)?.[1];
    const restored = readId ? await call('ctx_expand', { action: 'retrieve', id: readId }) : fullRead;
    const source = await Bun.file(join(root, 'AGENT.sidecar.md')).text();
    if (!textOf(restored).includes(source.trim())) throw new Error('Full file delivery/recovery lost Source content.');
  },
  async () => {
    child.kill();
    await child.exited;
    const readerFailure = await reader.then(
      () => undefined,
      (error: unknown) => error,
    );
    const diagnostics = await stderr;
    if (diagnostics.trim()) console.error(diagnostics);
    if (readerFailure) throw readerFailure;
  },
);
console.log('Cloud context-tool qualification PASS; shell archives are summaries, not raw evidence.');
