import type { NewExpression, Node } from '@babel/types';
import { hasExactValueImportBinding, moduleDeclarationFacts } from './runtime-import-bindings.ts';
import { isNamedIdentifier, moduleUrlResourceShape } from './module-url-resource-shape.ts';

const anchors = new Map<string, readonly [string, string]>([
  ['vida-agent/bin/bun.mjs', ['bundleRoot', '../']],
  ['vida-agent/bin/bun.ts', ['bundleRoot', '../']],
  ['vida-agent/bin/install.mjs', ['bundleRoot', '../']],
  ['vida-agent/bin/install.ts', ['bundleRoot', '../']],
  ['vida-agent/bin/local-release-artifacts.mjs', ['releaseRootDefault', '../../../']],
  ['vida-agent/bin/local-release-artifacts.ts', ['releaseRootDefault', '../../../']],
]);

// These declarations locate their module's default filesystem scope. They do
// not name resource bytes. Their code is still sealed; runtime root ownership
// and filesystem access remain governed by the callers' existing contracts.
export function moduleDirectoryAnchorCalls(
  tree: Node,
  file: string,
  sharedFacts?: ReturnType<typeof moduleDeclarationFacts>,
): ReadonlySet<NewExpression> {
  const found = new Set<NewExpression>();
  const anchor = anchors.get(file);
  if (!anchor) return found;
  const facts = moduleDeclarationFacts(tree, sharedFacts);
  if (facts.valueBindings.has('URL')) return found;
  if (!hasExactValueImportBinding(facts, 'node:url', 'fileURLToPath', 'fileURLToPath')) return found;
  for (const init of facts.constIdentifierInitializers.get(anchor[0]) ?? []) {
    if (
      init?.type !== 'CallExpression' ||
      !isNamedIdentifier(init.callee, 'fileURLToPath') ||
      init.arguments.length !== 1
    )
      continue;
    const url = moduleUrlResourceShape(init.arguments[0]);
    if (url?.specifier === anchor[1]) found.add(url.node);
  }
  return found;
}
