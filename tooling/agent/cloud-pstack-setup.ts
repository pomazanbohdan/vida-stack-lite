import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from '../../packages/agent/src/contracts/forward-controller-values.ts';
import { appendBoundedCloudReply, runCloudToolWithCleanup } from './cloud-tooling-contracts.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const install = process.argv.slice(2);
if (
  install.some((arg) => !['--install', '--provision-only'].includes(arg)) ||
  new Set(install).size !== install.length ||
  (install.includes('--provision-only') && !install.includes('--install'))
)
  throw new Error('Use --install [--provision-only] or no arguments.');
const pin = (await Bun.file(path.join(root, 'packages/agent/.bun-version')).text()).trim();
if (process.versions.bun !== pin) throw new Error('Use the package-selected Bun: ' + pin);
const pluginId = 'pstack@open-pstack';
const wantedPlugins = [
  { id: pluginId, source: 'https://github.com/arjitj2/open-pstack.git' },
  { id: 'superpowers@superpowers-dev', source: 'https://github.com/obra/superpowers.git' },
];
function command(argv: string[], cwd = root): string {
  const result = Bun.spawnSync(argv, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(argv[0] + ' failed: ' + result.stderr.toString());
  return result.stdout.toString();
}
function installedPlugins(): unknown[] {
  const value: unknown = JSON.parse(command(['codex', 'plugin', 'list', '--json']));
  if (!isRecord(value) || !Array.isArray(value.installed)) throw new Error('Malformed Codex plugin listing.');
  return value.installed;
}
function installedPlugin(listed: readonly unknown[], id: string) {
  const matches = listed.filter((item: unknown) => isRecord(item) && item.pluginId === id);
  if (matches.length > 1) throw new Error('Ambiguous plugin installation: ' + id);
  const item: unknown = matches[0];
  if (item === undefined) return null;
  if (
    !isRecord(item) ||
    item.installed !== true ||
    typeof item.enabled !== 'boolean' ||
    typeof item.version !== 'string'
  )
    throw new Error('Malformed plugin installation: ' + id);
  return item;
}
let listed = installedPlugins();
const missing = wantedPlugins.filter(({ id }) => installedPlugin(listed, id)?.enabled !== true);
if (missing.length && install.includes('--install')) {
  for (const { id, source } of missing) {
    command(['codex', 'plugin', 'marketplace', 'add', source, '--json']);
    command(['codex', 'plugin', 'add', id, '--json']);
  }
  listed = installedPlugins();
}
for (const { id } of wantedPlugins)
  if (installedPlugin(listed, id)?.enabled !== true) throw new Error(id + ' is not enabled; use --install.');
const plugin = installedPlugin(listed, pluginId)!;

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
    if (install.includes('--install'))
      command([process.execPath, 'install', '--production', '--frozen-lockfile', '--ignore-scripts'], scripts);
    command([path.join(scripts, 'model-policy/pstack-model-policy'), '--help']);
    const hooks = data(await request('hooks/list', { cwds: [root] }));
    if (!Array.isArray(hooks.hooks) || !Array.isArray(hooks.errors) || hooks.errors.length)
      throw new Error('Codex hook discovery failed.');
    const startup = hooks.hooks.filter(
      (item: unknown) => isRecord(item) && item.pluginId === pluginId && item.eventName === 'sessionStart',
    );
    const hook: unknown = startup[0];
    if (install.includes('--provision-only')) {
      console.log(
        JSON.stringify({
          plugins: wantedPlugins.map(({ id }) => ({
            id,
            version: installedPlugin(listed, id)!.version,
            enabled: true,
          })),
          qualification: 'provisioned-not-qualified',
          startupHook: startup.length === 1 && isRecord(hook) ? hook.trustStatus : 'unverified',
          providerTemplateSave: 'not performed by this script',
        }),
      );
      return;
    }
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
