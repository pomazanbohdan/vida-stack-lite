import type { Identifier, MetaProperty, NewExpression, Node } from '@babel/types';

export function isNamedIdentifier(node: Node | null | undefined, name: string): node is Identifier {
  return node?.type === 'Identifier' && node.name === name;
}

export function isImportMetaProperty(node: Node | null | undefined): node is MetaProperty {
  return node?.type === 'MetaProperty' && node.meta.name === 'import' && node.property.name === 'meta';
}

/** Shape only: callers retain selection, binding and resource ownership policy. */
export function moduleUrlResourceShape(
  node: Node | null | undefined,
): { node: NewExpression; specifier: string } | null {
  if (node?.type !== 'NewExpression' || !isNamedIdentifier(node.callee, 'URL') || node.arguments.length !== 2)
    return null;
  const specifier = node.arguments[0],
    base = node.arguments[1];
  if (
    specifier?.type !== 'StringLiteral' ||
    base?.type !== 'MemberExpression' ||
    base.computed ||
    !isNamedIdentifier(base.property, 'url') ||
    !isImportMetaProperty(base.object)
  )
    return null;
  return { node, specifier: specifier.value };
}
