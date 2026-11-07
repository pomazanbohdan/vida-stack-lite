#!/usr/bin/env bun
import path from 'node:path';
import {
  applyConsumerCleanInitialization,
  inspectConsumerCleanInitialization,
  planConsumerCleanInitialization,
  retireConsumerCleanInitialization,
  resumeConsumerCleanInitialization,
} from './consumer-clean-initialization-operation.ts';
import { projectMappings as validateProjectMappings } from './project-mapping-contract.ts';

type Parsed =
  | { readonly mode: 'inspect'; readonly projectRoot: string }
  | {
      readonly mode: 'plan';
      readonly projectRoot: string;
      readonly repository: string;
      readonly projectMappings: string[];
    }
  | {
      readonly mode: 'apply';
      readonly projectRoot: string;
      readonly repository: string;
      readonly projectMappings: string[];
      readonly operationId: string;
      readonly planBinding: string;
    }
  | {
      readonly mode: 'resume' | 'retire';
      readonly projectRoot: string;
      readonly operationId: string;
      readonly planBinding: string;
      readonly pendingSha256: string;
    };

export function cleanInitializationArguments(args: readonly string[]): Parsed {
  const candidate = args[0];
  if (
    candidate !== 'plan' &&
    candidate !== 'inspect' &&
    candidate !== 'apply' &&
    candidate !== 'resume' &&
    candidate !== 'retire'
  )
    throw Error('Invalid clean-init mode');
  const mode = candidate;
  const scalar = new Map<string, string>();
  const mappings: string[] = [];
  const allowed =
    mode === 'inspect'
      ? ['--project-root']
      : mode === 'plan'
        ? ['--project-root', '--repository', '--project']
        : mode === 'apply'
          ? ['--project-root', '--repository', '--project', '--operation-id', '--approve-plan']
          : ['--project-root', '--operation-id', '--approve-plan', '--pending-sha256'];
  for (let index = 1; index < args.length;) {
    const key = args[index];
    if (!key || !allowed.includes(key)) throw Error('Invalid clean-init option');
    if (key === '--project') {
      const value = args[index + 1];
      if (!value || value.startsWith('--') || !/^[a-z0-9][a-z0-9-]{0,63}=[^=]+$/u.test(value))
        throw Error('Invalid --project mapping');
      mappings.push(value);
      index += 2;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--') || scalar.has(key)) throw Error(`Invalid or duplicate ${key}`);
    scalar.set(key, value);
    index += 2;
  }
  const projectRoot = scalar.get('--project-root');
  if (!projectRoot || !path.isAbsolute(projectRoot) || path.resolve(projectRoot) !== projectRoot)
    throw Error('--project-root must be canonical and absolute');
  if (mode === 'inspect') {
    if (mappings.length || scalar.size !== 1) throw Error('inspect accepts only --project-root');
    return { mode, projectRoot };
  }
  if (mode === 'resume' || mode === 'retire') {
    const operationId = scalar.get('--operation-id');
    const planBinding = scalar.get('--approve-plan');
    const pendingSha256 = scalar.get('--pending-sha256');
    if (
      mappings.length ||
      scalar.size !== 4 ||
      !operationId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(operationId) ||
      !planBinding ||
      !/^[a-f0-9]{64}$/u.test(planBinding) ||
      !pendingSha256 ||
      !/^[a-f0-9]{64}$/u.test(pendingSha256)
    )
      throw Error(`${mode} requires --operation-id, --approve-plan and exact --pending-sha256`);
    return { mode, projectRoot, operationId, planBinding, pendingSha256 };
  }
  const repository = scalar.get('--repository');
  if (!repository || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(repository) || mappings.length === 0)
    throw Error(`${mode} requires --repository and one or more --project`);
  validateProjectMappings(mappings);
  if (mode === 'plan') return { mode, projectRoot, repository, projectMappings: mappings };
  const operationId = scalar.get('--operation-id');
  const planBinding = scalar.get('--approve-plan');
  if (
    !operationId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(operationId) ||
    !planBinding ||
    !/^[a-f0-9]{64}$/u.test(planBinding) ||
    scalar.size !== 4
  )
    throw Error('apply requires --operation-id and --approve-plan from the exact reviewed plan');
  return { mode, projectRoot, repository, projectMappings: mappings, operationId, planBinding };
}

export async function cleanInitializationResult(args: readonly string[]): Promise<unknown> {
  const parsed = cleanInitializationArguments(args);
  if (parsed.mode === 'inspect') return inspectConsumerCleanInitialization(parsed.projectRoot);
  if (parsed.mode === 'plan')
    return planConsumerCleanInitialization({
      projectRoot: parsed.projectRoot,
      repository: parsed.repository,
      projectMappings: parsed.projectMappings,
    });
  if (parsed.mode === 'apply') {
    const plan = planConsumerCleanInitialization(
      {
        projectRoot: parsed.projectRoot,
        repository: parsed.repository,
        projectMappings: parsed.projectMappings,
      },
      parsed.operationId as `${string}-${string}-${string}-${string}-${string}`,
    );
    if (plan.operation.binding !== parsed.planBinding) throw Error('Approved plan binding differs from current inputs');
    return applyConsumerCleanInitialization({
      operation: plan.operation,
      expectedState: { pending_sha256: null },
      authorization: { action: 'apply', operation_id: parsed.operationId, plan_binding: parsed.planBinding },
    });
  }
  const mutation = {
    repositoryRoot: parsed.projectRoot,
    operationId: parsed.operationId,
    planBinding: parsed.planBinding,
    expectedState: { pending_sha256: parsed.pendingSha256 },
  };
  const authorization = {
    action: parsed.mode,
    operation_id: parsed.operationId,
    plan_binding: parsed.planBinding,
  } as const;
  return parsed.mode === 'resume'
    ? resumeConsumerCleanInitialization({ ...mutation, authorization })
    : retireConsumerCleanInitialization({ ...mutation, authorization });
}

if (import.meta.main) {
  try {
    process.stdout.write(`${JSON.stringify(await cleanInitializationResult(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ schema: 'VidaAgentCommandResult/v1', status: 'blocked', message: error instanceof Error ? error.message : 'Unknown clean-init error' })}\n`,
    );
    process.exitCode = 1;
  }
}
