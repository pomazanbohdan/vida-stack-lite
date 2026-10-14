/** Reproducible development-host tools; no product install, suites or auto-index. */
import { createHash } from 'node:crypto';
import { appendFile, chmod, copyFile, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !['--with-semantic-model', '--prepare-index'].includes(arg))) {
  throw new Error('Supported optional flag: --with-semantic-model or --prepare-index');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bunPin = (await Bun.file(join(root, 'packages/agent/.bun-version')).text()).trim();
if (process.versions.bun !== bunPin) throw new Error(`Run Cloud setup with package-selected Bun ${bunPin}.`);
const allowedCpus = (await readFile('/proc/self/status', 'utf8')).match(/^Cpus_allowed_list:\s+([\d,-]+)$/m)?.[1];
const firstCpu = allowedCpus?.split(/[,-]/)[0];
if (!firstCpu) throw new Error('Could not determine the Cloud CPU affinity.');
if (args.includes('--prepare-index')) {
  // Explicit separate operation, after setup/static checks; never part of install.
  const current = BigInt((await readFile('/sys/fs/cgroup/memory.current', 'utf8')).trim());
  const rawLimit = (await readFile('/sys/fs/cgroup/memory.max', 'utf8')).trim();
  const reserve = 6n * 1024n ** 3n;
  if (rawLimit !== 'max' && BigInt(rawLimit) - current < reserve) {
    throw new Error(
      'Semantic index not started: require 6 GiB cgroup headroom. ' +
        'Preserve retained tmpfs evidence; use a clean/more spacious host and disk-backed scratch.',
    );
  }
  const child = Bun.spawn(
    [
      'taskset',
      '--cpu-list',
      firstCpu,
      join(homedir(), '.local/bin/vex'),
      'index',
      '--semantic',
      '--no-pattern-index',
      '--jobs',
      '1',
    ],
    { cwd: root, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' },
  );
  process.exit(await child.exited);
}
const lock = (await Bun.file(join(root, '.codex/cloud-tooling.lock.json')).json()) as {
  tools: { name: string; version: string; url: string; sha256: string; archive: 'tar' | 'zip'; binaries: string[] }[];
  semanticModel: { repository: string; revision: string; files: Record<string, string> };
};
if (process.platform !== 'linux' || process.arch !== 'x64') {
  throw new Error('This reviewed environment template supports Linux x86_64 glibc only.');
}
const bin = join(homedir(), '.local/bin');
const cache = join(homedir(), '.cache/vida-cloud-tooling');
await mkdir(bin, { recursive: true });
await mkdir(cache, { recursive: true });
// This Cloud host mounts /tmp and /dev/shm in RAM. Keep future scratch on disk.
const scratch = join(cache, 'tmp');
await mkdir(scratch, { recursive: true });
const shellQuote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
await Bun.write(
  join(cache, 'environment.sh'),
  `# managed-by: vida-cloud-tooling; source in the host startup shell\n` +
    `export TMPDIR=${shellQuote(scratch)}\nexport VIDA_VEX_CPU=${shellQuote(firstCpu)}\n`,
);
// Bash login shells otherwise keep using the RAM-backed /tmp after setup exits.
const profiles = ['.bash_profile', '.bash_login', '.profile'].map((file) => join(homedir(), file));
let profilePath = profiles[2]!;
for (const candidate of profiles) {
  if (await Bun.file(candidate).exists()) {
    profilePath = candidate;
    break;
  }
}
const profileMarker = '# vida-cloud-tooling environment';
const profile = await readFile(profilePath).catch((error: NodeJS.ErrnoException) => {
  if (error.code !== 'ENOENT') throw error;
  return Buffer.alloc(0);
});
if (!profile.includes(profileMarker)) {
  const environmentPath = shellQuote(join(cache, 'environment.sh'));
  await appendFile(
    profilePath,
    `\n${profileMarker}\n` + `if [ -f ${environmentPath} ]; then . ${environmentPath}; fi\n`,
  );
}
const run = (argv: string[], cwd = root) => {
  const result = Bun.spawnSync(argv, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(`${argv[0]} exited ${result.exitCode}: ${result.stderr.toString()}`);
  return result.stdout.toString();
};
const glibc = run(['getconf', 'GNU_LIBC_VERSION'])
  .trim()
  .match(/^glibc (\d+)\.(\d+)$/);
if (!glibc || Number(glibc[1]) < 2 || (Number(glibc[1]) === 2 && Number(glibc[2]) < 35)) {
  throw new Error('GNU tool archives require this template to have glibc >= 2.35.');
}
const digest = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
// Preserve the qualified executing Bun outside ephemeral repository scratch.
const hostBun = join(bin, 'bun');
if (process.execPath !== hostBun && (await digest(process.execPath)) !== (await digest(hostBun).catch(() => ''))) {
  const temporary = `${hostBun}.vida-${process.pid}`;
  try {
    await copyFile(process.execPath, temporary);
    await chmod(temporary, 0o755);
    await rename(temporary, hostBun);
  } finally {
    await rm(temporary, { force: true });
  }
}
const download = (url: string, output: string) =>
  run([
    'curl',
    '--fail',
    '--silent',
    '--show-error',
    '--location',
    '--retry',
    '2',
    '--connect-timeout',
    '20',
    '--max-time',
    '180',
    '--output',
    output,
    url,
  ]);
for (const tool of lock.tools) {
  const receiptPath = join(cache, `${tool.name}.json`);
  const receipt = (await Bun.file(receiptPath)
    .json()
    .catch(() => null)) as {
    archiveSha256: string;
    binaries: Record<string, string>;
  } | null;
  let current = receipt?.archiveSha256 === tool.sha256;
  for (const binary of tool.binaries) {
    current = current && receipt?.binaries[binary] === (await digest(join(bin, binary)).catch(() => ''));
  }
  if (current) {
    console.log(`${tool.name} ${tool.version}: already verified`);
    continue;
  }
  const stage = await mkdtemp(join(cache, 'stage-'));
  try {
    const archive = join(stage, `archive.${tool.archive === 'tar' ? 'tar.gz' : 'zip'}`);
    download(tool.url, archive);
    if ((await digest(archive)) !== tool.sha256) throw new Error(`${tool.name}: archive SHA-256 mismatch`);
    run(
      tool.archive === 'tar'
        ? ['tar', '-xzf', archive, '-C', stage, ...tool.binaries]
        : ['unzip', '-q', archive, ...tool.binaries, '-d', stage],
    );
    const binaries: Record<string, string> = {};
    for (const binary of tool.binaries) {
      const extracted = join(stage, binary);
      binaries[binary] = await digest(extracted);
      const temporary = join(bin, `.${binary}.vida-${process.pid}`);
      try {
        await copyFile(extracted, temporary);
        await chmod(temporary, 0o755);
        await rename(temporary, join(bin, binary));
      } finally {
        await rm(temporary, { force: true });
      }
    }
    console.log(run([join(bin, tool.name), '--version']).trim());
    await Bun.write(receiptPath, JSON.stringify({ archiveSha256: tool.sha256, binaries }, null, 2) + '\n');
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
const vexSettings = Bun.TOML.parse(await Bun.file(join(root, '.vex.toml')).text()) as { semantic?: boolean };
if (vexSettings.semantic || args.includes('--with-semantic-model')) {
  // Vex's hf-hub downloader does not accept this host's proxy CA. Prefetch via
  // curl with inherited proxy/CA, verify all bytes, then use the qualified cache.
  const model = lock.semanticModel;
  const vexCache = process.env.VEX_CACHE_DIR || join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'vex');
  const modelCache = join(
    process.env.HF_HOME || join(vexCache, 'embeddings'),
    `models--${model.repository.replaceAll('/', '--')}`,
  );
  const snapshot = join(modelCache, 'snapshots', model.revision);
  await mkdir(snapshot, { recursive: true });
  for (const [file, expected] of Object.entries(model.files)) {
    const destination = join(snapshot, file);
    if ((await digest(destination).catch(() => '')) === expected) continue;
    const temporary = `${destination}.vida-${process.pid}`;
    try {
      download(`https://huggingface.co/${model.repository}/resolve/${model.revision}/${file}?download=true`, temporary);
      if ((await digest(temporary)) !== expected) throw new Error(`Vex model ${file}: SHA-256 mismatch`);
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  await mkdir(join(modelCache, 'refs'), { recursive: true });
  // hf-hub reads this pointer verbatim: a newline makes the snapshot unresolved.
  await Bun.write(join(modelCache, 'refs/main'), model.revision);
  console.log('Vex semantic model: verified');
}
// Some delivery controls are global-only or not merged by the project overlay.
// Own only this setup's LeanCTX config; preserve another installation's settings.
const configPath = run([join(bin, 'lean-ctx'), 'config']).match(/^Global config: (.+)$/m)?.[1];
if (!configPath) throw new Error('LeanCTX did not identify its global config path.');
const marker = '# managed-by: vida-cloud-tooling\n';
const previous = await Bun.file(configPath)
  .text()
  .catch(() => null);
if (previous !== null && !previous.startsWith(marker)) {
  throw new Error(`Preserved existing LeanCTX config: review ${configPath} before adoption.`);
}
const managedConfig = marker + 'path_jail_scope = "project"\n' + (await Bun.file(join(root, '.lean-ctx.toml')).text());
await mkdir(dirname(configPath), { recursive: true });
if (previous !== managedConfig) await Bun.write(configPath, managedConfig);
// Trust this reviewed project overlay; no onboard/init/wrap or global hook changes.
run([join(bin, 'lean-ctx'), 'trust', root]);
console.log(`Tools ready. Put ${bin} on deployment PATH; refresh Vex once after writers join.`);
