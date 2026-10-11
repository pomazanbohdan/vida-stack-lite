import type { Node } from '@babel/types';

// Read only binding patterns, never traverse expression bodies as declarations.
export function runtimeBindingNames(node: Node): string[] {
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'RestElement') return runtimeBindingNames(node.argument);
  if (node.type === 'AssignmentPattern') return runtimeBindingNames(node.left);
  if (node.type === 'TSParameterProperty') return runtimeBindingNames(node.parameter);
  if (node.type === 'ArrayPattern') return node.elements.flatMap((entry) => (entry ? runtimeBindingNames(entry) : []));
  if (node.type === 'ObjectPattern')
    return node.properties.flatMap((entry) =>
      runtimeBindingNames(entry.type === 'RestElement' ? entry.argument : entry.value),
    );
  return [];
}

export function moduleHasValueBinding(tree: Node, name: string): boolean {
  const program = tree.type === 'File' ? tree.program : tree.type === 'Program' ? tree : null;
  for (const entry of program?.body ?? []) {
    const node =
      entry.type === 'ExportDefaultDeclaration' || entry.type === 'ExportNamedDeclaration' ? entry.declaration : entry;
    if (!node) continue;
    if (
      node.type === 'ImportDeclaration' &&
      node.importKind !== 'type' &&
      node.specifiers.some(
        (specifier) =>
          specifier.local.name === name && (specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type'),
      )
    )
      return true;
    if (
      node.type === 'VariableDeclaration' &&
      !node.declare &&
      node.declarations.some((declaration) => runtimeBindingNames(declaration.id).includes(name))
    )
      return true;
    if (
      (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') &&
      !node.declare &&
      node.id?.name === name
    )
      return true;
    if (
      (node.type === 'TSEnumDeclaration' || node.type === 'TSModuleDeclaration') &&
      !node.declare &&
      node.id.type === 'Identifier' &&
      node.id.name === name
    )
      return true;
    if (node.type === 'TSImportEqualsDeclaration' && node.importKind !== 'type' && node.id.name === name) return true;
  }
  return false;
}
