import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from '../../packages/agent/src/contracts/forward-controller-values.ts';
import { appendBoundedCloudReply, runCloudToolWithCleanup } from './cloud-tooling-contracts.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const install = process.argv.slice(2);
if (install.length > 1 || install.some((arg) => arg !== '--install')) throw new Error('Use --install or no arguments.');
const pin = (await Bun.file(path.join(root, 'packages/agent/.bun-version')).text()).trim();
if (process.versions.bun !== pin) throw new Error('Use the package-selected Bun: ' + pin);
const pluginId = 'pstack@open-pstack';
function command(argv: string[], cwd = root): string {
  const result = Bun.spawnSync(argv, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(argv[0] + ' failed: ' + result.stderr.toString());
  return result.stdout.toString();
}
function installedPlugin() {
  const value: unknown = JSON.parse(command(['codex', 'plugin', 'list', '--json']));
  if (!isRecord(value) || !Array.isArray(value.installed)) throw new Error('Malformed Codex plugin listing.');
  const matches = value.installed.filter((item: unknown) => isRecord(item) && item.pluginId === pluginId);
  if (matches.length > 1) throw new Error('Ambiguous Pstack installation.');
  const item: unknown = matches[0];
  if (item === undefined) return null;
  if (
    !isRecord(item) ||
    item.installed !== true ||
    typeof item.enabled !== 'boolean' ||
    typeof item.version !== 'string'
  )
    throw new Error('Malformed Pstack installation.');
  return item;
}
let plugin = installedPlugin();
if ((!plugin || plugin.enabled !== true) && install.length) {
  command(['codex', 'plugin', 'marketplace', 'add', 'arjitj2/open-pstack', '--json']);
  command(['codex', 'plugin', 'add', pluginId, '--json']);
  plugin = installedPlugin();
}
if (!plugin || plugin.enabled !== true) throw new Error('Pstack is not enabled. Run this script with --install.');

const child = Bun.spawn(['codex', 'app-server', '--stdio'], {
  cwd: root,
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'pipe',
});
const diagnostics = new Response(child.stderr).text();
const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
let readerFailure: Error | undefined;
const reader = (async () => {
  let buffer = '';
  const decoder = new TextDecoder();
  try {
    for await (const chunk of child.stdout) {
      buffer = appendBoundedCloudReply(buffer, decoder.decode(chunk, { stream: true }));
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const value: unknown = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (!isRecord(value)) throw new Error('Malformed Codex reply.');
        if (typeof value.id === 'number') {
          pending.get(value.id)?.resolve(value);
          pending.delete(value.id);
        }
      }
    }
    if (pending.size || buffer.trim()) throw new Error('Codex closed before qualification completed.');
  } catch (cause) {
    readerFailure = cause instanceof Error ? cause : new Error(String(cause));
    for (const item of pending.values()) item.reject(readerFailure);
    pending.clear();
  }
})();
let id = 0;
async function request(method: string, params: unknown) {
  if (readerFailure) throw readerFailure;
  const current = ++id;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply: unknown = await new Promise((resolve, reject) => {
      pending.set(current, { resolve, reject });
      timer = setTimeout(() => reject(new Error('Codex qualification timed out: ' + method)), 15_000);
      Promise.resolve(child.stdin.write(JSON.stringify({ id: current, method, params }) + '\n')).catch(reject);
    });
    if (!isRecord(reply) || reply.error !== undefined || !isRecord(reply.result))
      throw new Error('Codex qualification failed: ' + method);
    return reply.result;
  } finally {
    clearTimeout(timer);
    pending.delete(current);
  }
}
function data(result: Record<string, unknown>): Record<string, unknown> {
  if (
    !Array.isArray(result.data) ||
    result.data.length !== 1 ||
    !isRecord(result.data[0]) ||
    result.data[0].cwd !== root
  )
    throw new Error('Codex qualification returned another workspace.');
  return result.data[0];
}
await runCloudToolWithCleanup(
  async () => {
    await request('initialize', {
      clientInfo: { name: 'vida-pstack-qualification', version: '1' },
      capabilities: { experimentalApi: true },
    });
    await child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
    const skills = data(await request('skills/list', { cwds: [root], forceReload: true }));
    if (!Array.isArray(skills.skills) || !Array.isArray(skills.errors) || skills.errors.length)
      throw new Error('Codex skill discovery failed.');
    const owned = skills.skills.filter((item: unknown) => isRecord(item) && item.pluginId === pluginId);
    const entry: unknown = owned.find(
      (item: unknown) => isRecord(item) && item.name === 'pstack:poteto-mode' && item.enabled === true,
    );
    if (!isRecord(entry) || typeof entry.path !== 'string') throw new Error('Pstack entry skill is unavailable.');
    const scripts = path.resolve(path.dirname(entry.path), 'scripts');
    if (install.length)
      command([process.execPath, 'install', '--production', '--frozen-lockfile', '--ignore-scripts'], scripts);
    command([path.join(scripts, 'model-policy/pstack-model-policy'), '--help']);
    const hooks = data(await request('hooks/list', { cwds: [root] }));
    if (!Array.isArray(hooks.hooks) || !Array.isArray(hooks.errors) || hooks.errors.length)
      throw new Error('Codex hook discovery failed.');
    const startup = hooks.hooks.filter(
      (item: unknown) => isRecord(item) && item.pluginId === pluginId && item.eventName === 'sessionStart',
    );
    const hook: unknown = startup[0];
    if (
      startup.length !== 1 ||
      !isRecord(hook) ||
      hook.enabled !== true ||
      hook.trustStatus !== 'trusted' ||
      typeof hook.currentHash !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(hook.currentHash)
    )
      throw new Error(
        'Pstack hook trust GAP. Review this plugin in the native Codex /hooks UI; no trust bypass was applied.',
      );
    console.log(
      JSON.stringify({
        pluginId,
        version: plugin.version,
        enabled: true,
        skills: owned.length,
        startupHook: 'trusted',
        hookHash: hook.currentHash,
        modelProviderQualification: 'not requested',
        providerTemplateSave: 'not performed by this script',
      }),
    );
  },
  async () => {
    child.kill();
    await child.exited;
    await reader;
    const stderr = await diagnostics;
    if (readerFailure && stderr.trim()) console.error(stderr.slice(-1500));
    if (readerFailure) throw readerFailure;
  },
);
