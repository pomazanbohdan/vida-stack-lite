import path from 'node:path';
import { homedir } from 'node:os';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { standaloneDiscoveryFiles } from './cli-metadata.ts';
import { materializeResources, resourceDigest } from './standalone-resources.mjs';
import { cliMetadataResult, cliErrorResult } from './cli-metadata.ts';

// The build injects only its owned payload and inventory. These are not approval markers.
const nativeIdentityOption = '--vida-internal-native-identity-v1';

/** @param {{ index: unknown; payloadId: string; resourceIndexDigest: string; version: string }} input */
function writeNativeIdentity(input) {
  if (!Array.isArray(input.index)) throw new Error('Standalone resource index is invalid');
  const resourceIndexDigest = resourceDigest(JSON.stringify(input.index));
  if (
    !/^[a-f0-9]{64}$/u.test(input.payloadId) ||
    !/^[a-f0-9]{64}$/u.test(input.resourceIndexDigest) ||
    input.payloadId !== resourceIndexDigest ||
    input.resourceIndexDigest !== resourceIndexDigest
  )
    throw new Error('Standalone resource index digest differs');
  process.stdout.write(
    JSON.stringify({
      schema: 'VidaStandaloneIdentity/v1',
      version: input.version,
      pin: process.versions.bun,
      target: process.platform.replace('win32', 'windows') + '-' + process.arch,
      payloadId: input.payloadId,
      resourceIndexDigest,
    }) + '\n',
  );
}

/** @param {{ payload: string; index: { path: string; bytes: number; sha256: string }[]; payloadId: string; resourceIndexDigest: string; version: string }} input */
export async function runStandalone(input) {
  return runStandaloneMain(input);
}

/** @param {{ payload: string; index: { path: string; bytes: number; sha256: string }[]; payloadId: string; resourceIndexDigest: string; version: string }} input */
async function runStandaloneMain(input) {
  if (process.versions.bun !== '1.4.2') throw Error('Standalone runtime pin differs');
  if (process.argv[2] === nativeIdentityOption) {
    handleNativeIdentity(input);
    return;
  }
  return runStandaloneExecution(input);
}

/** @param {{ index: unknown; payloadId: string; resourceIndexDigest: string; version: string }} input */
function handleNativeIdentity(input) {
  try {
    if (process.argv.length !== 3) throw new Error('Standalone identity option cannot take extra arguments');
    writeNativeIdentity(input);
  } catch (error) {
    process.stderr.write(error instanceof Error ? error.message + '\n' : 'Standalone identity inspection failed\n');
    process.exitCode = 1;
  }
}

/** @param {{ payload: string; index: { path: string; bytes: number; sha256: string }[]; payloadId: string; resourceIndexDigest: string; version: string }} input */
async function runStandaloneExecution({ payload, index, payloadId, version }) {
  try {
    const metadata = cliMetadataResult(process.argv.slice(2), { name: 'vida-agent', version });
    if (metadata) {
      process.stdout.write(JSON.stringify(metadata) + '\n');
      return;
    }
  } catch (error) {
    process.stderr.write(JSON.stringify(cliErrorResult(error)) + '\n');
    process.exitCode = 1;
    return;
  }
  const argv = process.argv.slice(2);
  const discovery = argv[0] === 'instructions' || (argv.length === 2 && argv[0] === 'install' && argv[1] === '--check');
  const owned = new Set(standaloneDiscoveryFiles);
  const selectedIndex = discovery
    ? index.filter((entry) => owned.has(entry.path) || entry.path.startsWith('instructions/'))
    : index;
  const selectedPayloadId = discovery ? resourceDigest(JSON.stringify(selectedIndex)) : payloadId;
  const root = await materializeResources({
    cache: path.join(homedir(), '.vida-agent', 'runtime'),
    privateRoot: path.join(homedir(), '.vida-agent'),
    version,
    payloadId: selectedPayloadId,
    index: selectedIndex,
    loadFiles: async () => {
      const archive = new Bun.Archive(await Bun.file(payload).bytes());
      return discovery ? archive.files([...owned, 'instructions/**']) : archive.files();
    },
  });
  clearStandaloneEnvironment();
  process.env.BUN_BE_BUN = '1';
  process.env.VIDA_STANDALONE_ROOT = root;
  process.env.VIDA_STANDALONE_EXECUTABLE = realpathSync(process.execPath);
  // Reuse the current CLI in this process. Its command routes already launch the same executable as Bun when needed.
  await import(pathToFileURL(path.join(root, 'bin/vida-agent.mjs')).href);
}

function clearStandaloneEnvironment() {
  for (const name of Object.keys(process.env))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'BUN_BE_BUN', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE'].includes(
        name.toUpperCase(),
      )
    )
      delete process.env[name];
}
