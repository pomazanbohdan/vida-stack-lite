import path from 'node:path';
import { assertReconcileOptionKeys, reconcileAllowedOptions } from './reconcile-cli-contracts.ts';
import {
  inspectProjectUpgrade,
  planConfiguredProjectUpgradeRepair,
  resumeProjectUpgrade,
} from '../src/config/project-upgrade.ts';

function requireRepair(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('VIDA project upgrade: ' + message);
}

function parseUpgradeOptions(args: readonly string[]): Record<string, string> {
  const allowed = new Set(reconcileAllowedOptions('project-upgrade'));
  const options = Object.create(null) as Record<string, string>;
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    requireRepair(typeof key === 'string' && allowed.has(key), 'unsupported option');
    requireRepair(typeof value === 'string' && value.length > 0, 'option value is missing');
    requireRepair(!Object.hasOwn(options, key), 'duplicate option');
    options[key] = value;
  }
  return options;
}

function requiredOption(options: Readonly<Record<string, string>>, key: string): string {
  const value = options[key];
  requireRepair(typeof value === 'string' && value.length > 0, `required option is missing: ${key}`);
  return value;
}

function upgradeSelection(options: Readonly<Record<string, string>>) {
  requireRepair(options['--kind'] === 'project-upgrade', 'repair kind differs');
  const mode = requiredOption(options, '--mode');
  assertReconcileOptionKeys(options, 'project-upgrade', mode, 'project upgrade options differ from declaration');
  const root = requiredOption(options, '--project-root');
  requireRepair(path.isAbsolute(root) && path.resolve(root) === root, 'canonical absolute project root required');
  const operationId = requiredOption(options, '--repair-id');
  requireRepair(/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(operationId), 'repair id is invalid');
  const unknown = options['--reconcile-unknown'];
  requireRepair(unknown === undefined || unknown === 'true' || unknown === 'false', 'invalid reconciliation flag');
  return { root, operationId, mode, reconcileUnknown: unknown === 'true' };
}

/** Bundle-owned launcher. Parsed attribution is data; only the package's repair owner supplies authority. */
export async function runProjectUpgradeRepair(args: readonly string[]) {
  const options = parseUpgradeOptions(args);
  const selection = upgradeSelection(options);
  if (selection.mode === 'inspect' || selection.mode === 'plan') {
    const attribution = {
      operation_id: selection.operationId,
      actor: requiredOption(options, '--actor'),
      instruction_ref: requiredOption(options, '--instruction-ref'),
    };
    if (selection.mode === 'inspect') return inspectProjectUpgrade(selection.root, attribution);
    return planConfiguredProjectUpgradeRepair(selection.root, attribution);
  }
  return resumeProjectUpgrade(selection.root, selection.operationId, selection.reconcileUnknown);
}
