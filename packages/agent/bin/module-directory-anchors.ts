import type { NewExpression, Node } from '@babel/types';
import { moduleHasValueBinding } from './runtime-import-bindings.ts';

const anchors = new Map([
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
export function moduleDirectoryAnchorCalls(tree: Node, file: string): ReadonlySet<NewExpression> {
  const found = new Set<NewExpression>();
  const anchor = anchors.get(file);
  const program = tree.type === 'File' ? tree.program : tree.type === 'Program' ? tree : null;
  if (!anchor || !program || moduleHasValueBinding(tree, 'URL')) return found;
  const ownsDecoder = program.body.some(
    (node) =>
      node.type === 'ImportDeclaration' &&
      node.importKind !== 'type' &&
      node.source.value === 'node:url' &&
      node.specifiers.some(
        (specifier) =>
          specifier.type === 'ImportSpecifier' &&
          specifier.importKind !== 'type' &&
          specifier.imported.type === 'Identifier' &&
          specifier.imported.name === 'fileURLToPath' &&
          specifier.local.name === 'fileURLToPath',
      ),
  );
  if (!ownsDecoder) return found;
  for (const entry of program.body) {
    const node = entry.type === 'ExportNamedDeclaration' ? entry.declaration : entry;
    if (node?.type !== 'VariableDeclaration' || node.kind !== 'const' || node.declarations.length !== 1) continue;
    const declaration = node.declarations[0];
    if (declaration?.id.type !== 'Identifier' || declaration.id.name !== anchor[0]) continue;
    const init = declaration.init;
    if (
      init?.type !== 'CallExpression' ||
      init.callee.type !== 'Identifier' ||
      init.callee.name !== 'fileURLToPath' ||
      init.arguments.length !== 1
    )
      continue;
    const url = init.arguments[0];
    if (
      url?.type !== 'NewExpression' ||
      url.callee.type !== 'Identifier' ||
      url.callee.name !== 'URL' ||
      url.arguments.length !== 2
    )
      continue;
    const relative = url.arguments[0],
      base = url.arguments[1];
    if (
      relative?.type === 'StringLiteral' &&
      relative.value === anchor[1] &&
      base?.type === 'MemberExpression' &&
      !base.computed &&
      base.property.type === 'Identifier' &&
      base.property.name === 'url' &&
      base.object.type === 'MetaProperty' &&
      base.object.meta.name === 'import' &&
      base.object.property.name === 'meta'
    )
      found.add(url);
  }
  return found;
}
