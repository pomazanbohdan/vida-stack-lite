import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MutantResult, schema } from '@stryker-mutator/api/core';
import { declareFactoryPlugin, PluginKind } from '@stryker-mutator/api/plugin';
import type { DryRunCompletedEvent, MutationTestingPlanReadyEvent, Reporter } from '@stryker-mutator/api/report';
import { readBoundedInput } from './bun-coverage-evidence.ts';
import { isMutationInputDescriptorSchema, mutationPartitionSourceBinding } from './mutation-command-runner.ts';
import {
  mutationPartitionMap,
  mutationResultMapRow,
  writeMutationMapArtifact,
  type MutationMapBinding,
} from './mutation-map.ts';

function reporterBinding(directory: string, partition: string): MutationMapBinding {
  const bytes = readBoundedInput(
    path.join(directory, `${partition}.inputs.json`),
    directory,
    'Mutation map descriptor',
    false,
  );
  const descriptor: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes!));
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor))
    throw new Error('Mutation map descriptor is invalid.');
  const read = (key: string): unknown => Reflect.get(descriptor, key);
  if (
    !isMutationInputDescriptorSchema(read('schema')) ||
    read('partition') !== partition ||
    !Array.isArray(read('partition_sources')) ||
    !Array.isArray(read('partition_source_inputs'))
  )
    throw new Error('Mutation map descriptor binding is invalid.');
  const sourceBinding = mutationPartitionSourceBinding(
    partition,
    read('partition_sources') as string[],
    read('partition_source_inputs') as { path: string; sha256: string }[],
  );
  if (!sourceBinding || sourceBinding.fingerprint !== process.env.AGENT_RUNTIME_MUTATION_PARTITION_SOURCE_FINGERPRINT)
    throw new Error('Mutation map Source binding differs from its parent.');
  const hashes = Object.fromEntries(
    ['input', 'source', 'test', 'tool'].map((name) => {
      const value = read(`${name}_fingerprint`);
      if (
        typeof value !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(value) ||
        value !== process.env[`AGENT_RUNTIME_${name.toUpperCase()}_FINGERPRINT`]
      )
        throw new Error('Mutation map input fingerprints differ from their parent.');
      return [`${name}_fingerprint`, value];
    }),
  ) as Pick<MutationMapBinding, 'input_fingerprint' | 'source_fingerprint' | 'test_fingerprint' | 'tool_fingerprint'>;
  const runId = process.env.AGENT_RUNTIME_MUTATION_RUN_ID;
  if (!runId || !/^[a-f0-9-]{36}$/u.test(runId)) throw new Error('Mutation map run ID is invalid.');
  return { run_id: runId, partition, ...hashes, partition_sources: sourceBinding.sourceInputs };
}

/** Public reporter observations only; the parent remains the assertion/custody owner. */
class MutationMapReporter implements Reporter {
  readonly #binding: MutationMapBinding;
  readonly #root = process.cwd();
  readonly #identities = new Map<string, string>();
  readonly #observed = new Set<string>();
  readonly #journalHash = createHash('sha256');
  #journalFd: number | undefined;
  #journalBytes = 0;
  #plan: ReturnType<typeof writeMutationMapArtifact> | undefined;
  #failed = false;

  constructor(
    readonly directory: string,
    readonly partition: string,
  ) {
    this.#binding = reporterBinding(directory, partition);
  }

  #capture(action: () => void): void {
    try {
      action();
    } catch (error) {
      this.#failed = true;
      throw error;
    }
  }

  onDryRunCompleted(event: DryRunCompletedEvent): void {
    this.#capture(() => {
      writeMutationMapArtifact(this.directory, `${this.partition}.map-dry-run.json`, {
        schema: 'MutationMapDryRun/v1',
        binding: this.#binding,
        result: event.result,
        timing: event.timing,
        capabilities: event.capabilities,
        confirmed_status: 'unconfirmed',
      });
    });
  }

  onMutationTestingPlanReady(event: MutationTestingPlanReadyEvent): void {
    this.#capture(() => {
      if (this.#plan) throw new Error('Mutation map plan was already captured.');
      const map = mutationPartitionMap(this.#root, this.#binding, event.mutantPlans);
      this.#plan = writeMutationMapArtifact(this.directory, `${this.partition}.map-plan.json`, map);
      for (const mutant of map.mutants) this.#identities.set(mutant.local_id, mutant.identity);
      this.#journalFd = openSync(path.join(this.directory, `${this.partition}.map-events.jsonl`), 'wx', 0o600);
    });
  }

  onMutantTested(result: MutantResult): void {
    this.#capture(() => {
      const row = mutationResultMapRow(this.#root, this.#binding, result);
      if (
        this.#journalFd === undefined ||
        this.#observed.has(result.id) ||
        this.#identities.get(result.id) !== row.identity
      )
        throw new Error('Mutation map event has no unique matching plan.');
      const bytes = Buffer.from(JSON.stringify(row) + '\n');
      if (this.#journalBytes + bytes.length > 32 * 1024 * 1024)
        throw new Error('Mutation map journal exceeds its byte bound.');
      writeFileSync(this.#journalFd, bytes);
      this.#journalBytes += bytes.length;
      this.#journalHash.update(bytes);
      this.#observed.add(result.id);
    });
  }

  onMutationTestReportReady(_report: Readonly<schema.MutationTestResult>): void {
    if (this.#failed || !this.#plan || this.#journalFd === undefined || this.#observed.size !== this.#identities.size)
      throw new Error('Mutation map final report has incomplete event accounting.');
    fsyncSync(this.#journalFd);
    writeMutationMapArtifact(this.directory, `${this.partition}.map-terminal.json`, {
      schema: 'MutationMapTerminal/v1',
      binding: this.#binding,
      plan: this.#plan,
      events: {
        file: `${this.partition}.map-events.jsonl`,
        bytes: this.#journalBytes,
        sha256: this.#journalHash.digest('hex'),
      },
      mutants: this.#identities.size,
      confirmed_status: 'unconfirmed',
    });
  }

  wrapUp(): void {
    const fd = this.#journalFd;
    this.#journalFd = undefined;
    if (fd !== undefined) closeSync(fd);
  }
}

function createMutationMapReporter(): Reporter {
  const directory = process.env.AGENT_RUNTIME_MUTATION_DIRECTORY;
  const partition = process.env.AGENT_RUNTIME_MUTATION_PARTITION;
  if (!directory || !path.isAbsolute(directory) || !partition || !/^[a-z0-9-]+$/u.test(partition))
    throw new Error('Mutation map reporter requires its parent-issued directory and partition.');
  return new MutationMapReporter(directory, partition);
}

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Reporter, 'vida-mutant-map', createMutationMapReporter)];
