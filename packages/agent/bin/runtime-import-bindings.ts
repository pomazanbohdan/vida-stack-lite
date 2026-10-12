import type { Expression, ImportDeclaration, Node, Program } from '@babel/types';

interface ModuleValueImportBinding {
  readonly source: string;
  readonly importedName: string | null;
  readonly localName: string;
}

export interface ModuleDeclarationFacts {
  readonly program: Program | null;
  readonly valueBindings: ReadonlySet<string>;
  readonly namedImports: readonly ModuleValueImportBinding[];
  readonly constIdentifierInitializers: ReadonlyMap<string, readonly (Expression | null)[]>;
}

type DirectStatementFacts = {
  readonly valueBindings: readonly string[];
  readonly namedImports: readonly ModuleValueImportBinding[];
  readonly constIdentifierInitializer: { readonly name: string; readonly initializer: Expression | null } | null;
};

const namedRuntimeDeclarationKinds: ReadonlySet<string> = new Set([
  'FunctionDeclaration',
  'ClassDeclaration',
  'TSEnumDeclaration',
  'TSModuleDeclaration',
  'TSImportEqualsDeclaration',
]);

function namedRuntimeDeclarationBinding(node: Node): string | null {
  if (!namedRuntimeDeclarationKinds.has(node.type) || ('declare' in node && node.declare)) return null;
  if (node.type === 'TSImportEqualsDeclaration' && node.importKind === 'type') return null;
  return 'id' in node && node.id?.type === 'Identifier' ? node.id.name : null;
}

function valueImportBindings(node: ImportDeclaration): {
  valueBindings: string[];
  namedImports: ModuleValueImportBinding[];
} {
  const valueBindings: string[] = [];
  const namedImports: ModuleValueImportBinding[] = [];
  if (node.importKind === 'type') return { valueBindings, namedImports };
  for (const specifier of node.specifiers) {
    if (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type') continue;
    valueBindings.push(specifier.local.name);
    if (specifier.type === 'ImportSpecifier')
      namedImports.push({
        source: node.source.value,
        importedName: specifier.imported.type === 'Identifier' ? specifier.imported.name : null,
        localName: specifier.local.name,
      });
  }
  return { valueBindings, namedImports };
}

function singleConstIdentifierInitializer(
  node: Node,
): { readonly name: string; readonly initializer: Expression | null } | null {
  if (node.type !== 'VariableDeclaration' || node.kind !== 'const' || node.declarations.length !== 1) return null;
  const declaration = node.declarations[0];
  return declaration?.id.type === 'Identifier'
    ? { name: declaration.id.name, initializer: declaration.init ?? null }
    : null;
}

function directStatementFacts(entry: Node): DirectStatementFacts {
  const node =
    entry.type === 'ExportDefaultDeclaration' || entry.type === 'ExportNamedDeclaration' ? entry.declaration : entry;
  if (!node) return { valueBindings: [], namedImports: [], constIdentifierInitializer: null };
  if (node.type === 'ImportDeclaration') {
    const imported = valueImportBindings(node);
    return { ...imported, constIdentifierInitializer: null };
  }
  if (node.type === 'VariableDeclaration')
    return {
      valueBindings: node.declare
        ? []
        : node.declarations.flatMap((declaration) => runtimeBindingNames(declaration.id)),
      namedImports: [],
      constIdentifierInitializer: singleConstIdentifierInitializer(node),
    };
  const named = namedRuntimeDeclarationBinding(node);
  return {
    valueBindings: named === null ? [] : [named],
    namedImports: [],
    constIdentifierInitializer: null,
  };
}

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

export function moduleDeclarationFacts(tree: Node, sharedFacts?: ModuleDeclarationFacts): ModuleDeclarationFacts {
  const program = tree.type === 'File' ? tree.program : tree.type === 'Program' ? tree : null;
  if (!program) return emptyModuleDeclarationFacts();
  if (sharedFacts) return sharedFacts.program === program ? sharedFacts : emptyModuleDeclarationFacts();
  return collectModuleDeclarationFacts(program);
}

function emptyModuleDeclarationFacts(): ModuleDeclarationFacts {
  return {
    program: null,
    valueBindings: new Set(),
    namedImports: [],
    constIdentifierInitializers: new Map(),
  };
}

function collectModuleDeclarationFacts(program: Program): ModuleDeclarationFacts {
  const valueBindings = new Set<string>();
  const namedImports: ModuleValueImportBinding[] = [];
  const constIdentifierInitializers = new Map<string, (Expression | null)[]>();
  for (const entry of program.body) {
    const facts = directStatementFacts(entry);
    for (const name of facts.valueBindings) valueBindings.add(name);
    namedImports.push(...facts.namedImports);
    const candidate = facts.constIdentifierInitializer;
    if (candidate) {
      const initializers = constIdentifierInitializers.get(candidate.name);
      if (initializers) initializers.push(candidate.initializer);
      else constIdentifierInitializers.set(candidate.name, [candidate.initializer]);
    }
  }
  return { program, valueBindings, namedImports, constIdentifierInitializers };
}

export function hasExactValueImportBinding(
  facts: ModuleDeclarationFacts,
  source: string,
  importedName: string,
  localName: string,
): boolean {
  return facts.namedImports.some(
    (binding) => binding.source === source && binding.importedName === importedName && binding.localName === localName,
  );
}

export function moduleHasValueBinding(tree: Node, name: string): boolean {
  return moduleDeclarationFacts(tree).valueBindings.has(name);
}
