import { lstat, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Mutant } from '@stryker-mutator/api/core';
import type { Logger } from '@stryker-mutator/api/logging';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { sha256 } from './bun-coverage-evidence.ts';
import { mutationGeneratedUniverse, type MutationMapBinding } from './mutation-map.ts';
import { mutationPartitionSourceBinding } from './mutation-command-runner.ts';

/** Shared installed Core ingress for the CLI and its public instrumenter dependency. */
export async function installedStrykerCli(root: string): Promise<string> {
  const declaredBin: (typeof import('@stryker-mutator/core/package.json'))['bin']['stryker'] = './bin/stryker.js';
  const packageRoot = path.join(root, 'node_modules/@stryker-mutator/core');
  const installed: unknown = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const declared: unknown = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (!isRecord(installed) || installed.name !== '@stryker-mutator/core' || !isRecord(declared))
    throw new Error('Installed Stryker Core package owner is invalid.');
  const dependencies = isRecord(declared.devDependencies)
    ? declared.devDependencies
    : isRecord(declared.dependencies)
      ? declared.dependencies
      : null;
  if (
    !dependencies ||
    typeof dependencies['@stryker-mutator/core'] !== 'string' ||
    !/^\d+\.\d+\.\d+$/u.test(dependencies['@stryker-mutator/core']) ||
    installed.version !== dependencies['@stryker-mutator/core'] ||
    !isRecord(installed.bin) ||
    installed.bin.stryker !== declaredBin
  )
    throw new Error('Installed Stryker Core does not match its exact package owner and CLI entry.');
  const cli = path.join(packageRoot, installed.bin.stryker);
  const info = await lstat(cli);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Installed Stryker Core CLI must be a regular file.');
  return cli;
}

type Instrumenter = {
  instrument(
    files: readonly { name: string; content: string; mutate: true }[],
    options: { plugins: null; ignorers: []; excludedMutations: [] },
  ): Promise<{
    files: readonly { name: string; content: string }[];
    mutants: readonly Mutant[];
  }>;
};

/** Generate once in memory. This neither executes tests nor writes an active Source file. */
export async function generateMutationImage(
  root: string,
  binding: MutationMapBinding,
  captured: Readonly<Record<string, Buffer>>,
) {
  const selected = mutationPartitionSourceBinding(
    binding.partition,
    binding.partition_sources.map((row) => row.path),
    binding.partition_sources,
  );
  if (!selected) throw new Error('Mutation generation captured Source binding is invalid.');
  const files = selected.sourceInputs.map((source) => {
    const bytes = captured[source.path];
    if (!bytes || sha256(bytes) !== source.sha256) throw new Error('Mutation generation captured Source differs.');
    return {
      name: path.join(root, source.path),
      content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      mutate: true as const,
    };
  });
  const cli = await installedStrykerCli(root);
  const coreFile = await realpath(path.join(path.dirname(path.dirname(cli)), 'package.json'));
  const requireCore = createRequire(coreFile);
  const instrumenterFile = requireCore.resolve('@stryker-mutator/instrumenter/package.json');
  const core: unknown = JSON.parse(await readFile(coreFile, 'utf8'));
  const installed: unknown = JSON.parse(await readFile(instrumenterFile, 'utf8'));
  if (
    !isRecord(core) ||
    !isRecord(core.dependencies) ||
    !isRecord(installed) ||
    installed.name !== '@stryker-mutator/instrumenter' ||
    typeof installed.version !== 'string' ||
    installed.version !== core.dependencies['@stryker-mutator/instrumenter'] ||
    installed.version !== core.version
  )
    throw new Error('Installed mutation instrumenter differs from its Core dependency.');
  const entry = requireCore.resolve('@stryker-mutator/instrumenter');
  const entryHash = sha256(await readFile(entry));
  const loaded: unknown = await import(pathToFileURL(entry).href);
  if (!isRecord(loaded) || typeof loaded.Instrumenter !== 'function')
    throw new Error('Public mutation instrumenter is unavailable.');
  const warnings: string[] = [];
  const noop = () => undefined;
  const disabled = () => false;
  const warn = (message: string) => {
    warnings.push(message);
  };
  const logger: Logger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn,
    error: warn,
    fatal: warn,
    isTraceEnabled: disabled,
    isDebugEnabled: disabled,
    isInfoEnabled: disabled,
    isWarnEnabled: disabled,
    isErrorEnabled: disabled,
    isFatalEnabled: disabled,
  };
  const instrumenter = Reflect.construct(loaded.Instrumenter, [logger]) as Instrumenter;
  const generated = await instrumenter.instrument(files, { plugins: null, ignorers: [], excludedMutations: [] });
  if (warnings.length || sha256(await readFile(entry)) !== entryHash)
    throw new Error('Mutation generation warnings or instrumenter drift prevent admission.');
  const seen = new Set<string>();
  const imageFiles = generated.files.map((file) => {
    const relative = path.relative(root, file.name).replaceAll('\\', '/');
    if (!selected.sources.includes(relative) || seen.has(relative) || typeof file.content !== 'string')
      throw new Error('Mutation instrumented image differs from its exact Source domain.');
    seen.add(relative);
    return { path: relative, content: file.content, sha256: sha256(file.content) };
  });
  if (seen.size !== selected.sources.length) throw new Error('Mutation instrumented image is incomplete.');
  return {
    schema: 'MutationGeneratedImage/v1' as const,
    generator: {
      core_version: installed.version,
      instrumenter_version: installed.version,
      entry_sha256: entryHash,
      options: { plugins: null, ignorers: [], excludedMutations: [] },
    },
    universe: mutationGeneratedUniverse(root, binding, generated.mutants),
    files: imageFiles,
  };
}
