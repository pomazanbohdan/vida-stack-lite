import { expect } from 'bun:test';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import z from 'zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pinnedEnvironment, boundedSpawnSync, executionBudget, readPin } from '../../bin/bun.ts';
import type { AgentRuntimeConfig } from '../../src/config/runtime-config.ts';
import type { ConfiguredFrontierReceipt } from '../../src/orchestration/delivered-work-continuation-repair.ts';
import type * as continuationProjection from '../../src/orchestration/delivered-work-continuation.ts';
import { runtimeRoot, retainContinuationFixtureRoot } from './delivered-work-continuation-fixture.ts';

function requireFixtureValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Fixture is missing ${label}`);
  return value;
}

async function createOriginalFrontierEngine(
  root: string,
  config: AgentRuntimeConfig,
  input: {
    receipt: ConfiguredFrontierReceipt;
    prewriterBinding: Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0];
  },
) {
  const receipt = input.receipt,
    journal = receipt.prior_journal,
    selection = input.prewriterBinding.selection;
  const journalSourceScope = requireFixtureValue(journal.source_scope, 'engine fixture journal source scope');
  const initial = {
    work_id: receipt.request.identity.work_id,
    attempt: 1,
    workflow_id: receipt.request.action.workflow_id,
    scope_digest: journalSourceScope.digest,
    config_digest: receipt.request.priorConfigDigest,
    selection,
    observations: [],
  };
  const stateSchema = z.object({
    work_id: z.string(),
    attempt: z.number().int(),
    workflow_id: z.string(),
    scope_digest: z.string(),
    config_digest: z.string(),
    selection: z.unknown(),
    observations: z.array(z.unknown()),
  });
  const workflow = createWorkflow({ id: initial.workflow_id, inputSchema: stateSchema, outputSchema: stateSchema });
  for (const wave of journal.completed) {
    workflow.then(
      createStep({
        id: wave.step_id,
        inputSchema: stateSchema,
        outputSchema: stateSchema,
        suspendSchema: z.object({ requests: z.array(z.unknown()) }),
        resumeSchema: z.object({ observations: z.array(z.unknown()).min(1) }),
        execute: async ({ inputData, resumeData, suspend }) => {
          if (!resumeData) return await suspend({ requests: wave.items.map((item) => item.request) });
          return { ...inputData, observations: [...inputData.observations, ...resumeData.observations] };
        },
      }),
    );
  }
  workflow.then(
    createStep({
      id: requireFixtureValue(journal.step_id, 'fixture journal step id'),
      inputSchema: stateSchema,
      outputSchema: stateSchema,
      suspendSchema: z.object({ requests: z.array(z.unknown()) }),
      resumeSchema: z.object({ observations: z.array(z.unknown()).min(1) }),
      execute: async ({ suspend }) => await suspend({ requests: journal.items.map((item) => item.request) }),
    }),
  );
  workflow.commit();
  const file = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite');
  mkdirSync(path.dirname(file), { recursive: true });
  const storage = new LibSQLStore({ id: 'original-frontier-fixture', url: pathToFileURL(file).href });
  new Mastra({ workflows: { original: workflow }, storage, logger: false });
  const run = await workflow.createRun({ runId: journal.run_id });
  await run.start({ inputData: initial });
  for (const wave of journal.completed)
    await run.resume({ step: wave.step_id, resumeData: { observations: wave.items.map((item) => item.observation) } });
  await storage.close();
}

export async function seedOriginalFrontierEngine(
  root: string,
  config: AgentRuntimeConfig,
  input: {
    receipt: ConfiguredFrontierReceipt;
    prewriterBinding: Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0];
  },
  budget = executionBudget(60_000),
) {
  const payload = path.join(root, 'original-engine-fixture.json');
  writeFileSync(
    payload,
    JSON.stringify({
      root,
      workRoot: config.control.work_root,
      receipt: input.receipt,
      selection: input.prewriterBinding.selection,
    }),
  );
  const code = `import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url'; import {createRequire} from 'node:module';
const require=createRequire(process.env.VIDA_FRONTIER_PACKAGE); const {createStep,createWorkflow}=require('@mastra/core/workflows'); const {Mastra}=require('@mastra/core/mastra'); const {LibSQLStore}=require('@mastra/libsql'); const {z}=require('zod');
const {mkdirSync}=fs; const data=JSON.parse(fs.readFileSync(process.env.VIDA_FRONTIER_INPUT,'utf8'));
${requireFixtureValue.toString()}
${createOriginalFrontierEngine.toString()}
await createOriginalFrontierEngine(data.root,{control:{work_root:data.workRoot}},{receipt:data.receipt,prewriterBinding:{selection:data.selection}}); process.exit(0);`;
  expect(process.versions.bun).toBe(readPin());
  const executable = process.execPath;
  const result = boundedSpawnSync(
    spawnSync,
    executable,
    ['-e', code],
    {
      cwd: path.join(runtimeRoot, 'packages', 'agent'),
      windowsHide: true,
      encoding: 'utf8',
      env: {
        ...pinnedEnvironment(executable),
        VIDA_FRONTIER_PACKAGE: path.join(runtimeRoot, 'packages', 'agent', 'package.json'),
        VIDA_FRONTIER_INPUT: payload,
      },
      budget,
    },
    'fixture original frontier engine',
  );
  if (result.error || result.signal || result.status !== 0) retainContinuationFixtureRoot(root);
  if (result.signal || result.status !== 0)
    process.stderr.write('Fixture child output: ' + result.stdout + result.stderr + '\n');
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status, typeof result.stderr === 'string' ? result.stderr : 'Fixture original frontier failed').toBe(0);
}
