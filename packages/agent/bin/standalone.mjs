import path from 'node:path';
import { homedir } from 'node:os';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { installerProtectedFiles } from './cli-metadata.mjs';
import { materializeResources, resourceDigest } from './standalone-resources.mjs';
import { cliMetadataResult, cliErrorResult } from './cli-metadata.mjs';

// The build injects only its owned payload and inventory. These are not approval markers.
export async function runStandalone({ payload, index, payloadId, version }) {
  if (process.versions.bun !== '1.4.2') throw Error('Standalone runtime pin differs');
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
  const owned = new Set([...installerProtectedFiles, 'bin/vida-agent.mjs', 'bin/cli-metadata.mjs', 'bunfig.toml']);
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
  for (const name of Object.keys(process.env))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'BUN_BE_BUN', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE'].includes(
        name.toUpperCase(),
      )
    )
      delete process.env[name];
  process.env.BUN_BE_BUN = '1';
  process.env.VIDA_STANDALONE_ROOT = root;
  process.env.VIDA_STANDALONE_EXECUTABLE = realpathSync(process.execPath);
  // Reuse the current CLI in this process. Its command routes already launch the same executable as Bun when needed.
  await import(pathToFileURL(path.join(root, 'bin/vida-agent.mjs')).href);
}
