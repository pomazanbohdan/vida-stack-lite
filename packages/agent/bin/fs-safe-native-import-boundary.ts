import type {
  AssignmentExpression,
  CallExpression,
  FunctionDeclaration,
  Identifier,
  ImportDeclaration,
  Node,
  Program,
  UpdateExpression,
  VariableDeclaration,
} from '@babel/types';
import { runtimeBindingNames } from './runtime-import-bindings.ts';

type Pattern = string | number | boolean | null | readonly Pattern[] | { readonly [key: string]: Pattern };
const id = (name: string): Pattern => ({ type: 'Identifier', name });
const text = (value: string): Pattern => ({ type: 'StringLiteral', value });
const member = (object: Pattern, property: string, computed = false): Pattern => ({
  type: 'MemberExpression',
  object,
  property: id(property),
  computed,
});
const call = (callee: Pattern, ...args: Pattern[]): Pattern => ({ type: 'CallExpression', callee, arguments: args });
const binary = (operator: string, left: Pattern, right: Pattern): Pattern => ({
  type: 'BinaryExpression',
  operator,
  left,
  right,
});
const unary = (operator: string, argument: Pattern): Pattern => ({
  type: 'UnaryExpression',
  operator,
  argument,
  prefix: true,
});
const logical = (operator: string, left: Pattern, right: Pattern): Pattern => ({
  type: 'LogicalExpression',
  operator,
  left,
  right,
});
const variable = (name: string, init: Pattern): Pattern => ({
  type: 'VariableDeclaration',
  kind: 'const',
  declarations: [{ type: 'VariableDeclarator', id: id(name), init }],
});
const returned = (argument: Pattern): Pattern => ({ type: 'ReturnStatement', argument });
const expression = (expression: Pattern): Pattern => ({ type: 'ExpressionStatement', expression });

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function erased(value: unknown): unknown {
  while (
    object(value) &&
    ['TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression', 'ParenthesizedExpression'].includes(String(value.type))
  )
    value = value.expression;
  return value;
}
// Finite maintained recipes, evaluated against the caller's already-parsed AST.
// This recognizes dependency edges; sealed bytes/reviews and runtime attestation
// remain separate authorities. No generated current-source hash is an allowlist.
function matches(value: unknown, pattern: Pattern): boolean {
  value = erased(value);
  if (Array.isArray(pattern))
    return (
      Array.isArray(value) &&
      value.length === pattern.length &&
      (pattern as Pattern[]).every((item, index) => matches(value[index], item))
    );
  if (object(pattern))
    return object(value) && Object.entries(pattern).every(([key, item]) => matches(value[key], item as Pattern));
  return value === pattern;
}
function initializer(fn: FunctionDeclaration | undefined, index: number): Node | null {
  const statement = fn?.body.body[index];
  if (statement?.type !== 'VariableDeclaration' || statement.declarations.length !== 1) return null;
  return statement.declarations[0]?.init ?? null;
}
function functionMatches(fn: FunctionDeclaration | undefined, params: string[], body: Pattern[]): boolean {
  return matches(fn, {
    type: 'FunctionDeclaration',
    async: false,
    generator: false,
    params: params.map(id),
    body: { type: 'BlockStatement', body },
  });
}

const globals = [
  'moduleRequire',
  'fsSafePackageRoot',
  'fsSafePackageNativeTarget',
  'fsSafePackageAttested',
  'fsSafePackageMaxBytes',
];
const helpers = [
  'resolveFsSafePackageRoot',
  'resolveFsSafeNativePackageRoot',
  'fsSafeNativeTarget',
  'fsSafePackageTreeHash',
  'readFsSafePackageFile',
  'matchesAttestedNativeBinding',
  'loadLinuxNativeBinding',
  'loadWindowsNativeBinding',
];
const imports = new Map([
  ['createRequire', 'node:module'],
  ['path', 'node:path'],
  ['realpathSync', 'node:fs'],
  ['readFileSync', 'node:fs'],
  ['closeSync', 'node:fs'],
  ['createHash', 'node:crypto'],
  ['openRootFileSync', '@openclaw/fs-safe/advanced'],
  ['fsSafePackageManifest', './fs-safe-attestation.js'],
  ['fsSafeVersion', './fs-safe-attestation.js'],
  ['fsSafePackageTreeSha256ByNativeTarget', './fs-safe-attestation.js'],
]);
const protectedNames = new Set([...globals, ...helpers, ...imports.keys(), 'Number', 'Boolean', 'JSON', 'process']);
const root = id('fsSafePackageRoot'),
  target = id('fsSafePackageNativeTarget');
const digest = member(id('fsSafePackageTreeSha256ByNativeTarget'), 'fsSafePackageNativeTarget', true);
const treeHash = call(id('fsSafePackageTreeHash'), root, target);
const metadata = (root: Pattern): Pattern =>
  call(
    member(id('JSON'), 'parse'),
    call(member(call(id('readFsSafePackageFile'), root, text('package.json')), 'toString'), text('utf8')),
  );
const reject = (condition: Pattern, message: string): Pattern =>
  expression(call(id('reject'), condition, text(message)));

interface BoundaryDeclarations {
  readonly functions: Map<string, FunctionDeclaration>;
  readonly constants: Map<string, VariableDeclaration>;
  readonly imported: Map<string, string>;
}

const finiteCallees = new Set(['resolveFsSafeNativePackageRoot', 'fsSafePackageTreeHash']);
type BindingRecorder = (node: Node) => boolean;

function recordDeclarationBindings(node: Node, bind: BindingRecorder): void {
  if (
    (node.type === 'ClassDeclaration' || node.type === 'ClassExpression' || node.type === 'TSEnumDeclaration') &&
    node.id
  )
    bind(node.id);
  if (node.type === 'VariableDeclarator') bind(node.id);
  if (
    node.type === 'ImportSpecifier' ||
    node.type === 'ImportDefaultSpecifier' ||
    node.type === 'ImportNamespaceSpecifier'
  )
    bind(node.local);
}

function recordCallableBindings(node: Node, bind: BindingRecorder): void {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    if (node.type !== 'ArrowFunctionExpression' && node.id) bind(node.id);
    for (const parameter of node.params) bind(parameter);
  }
  if (node.type === 'CatchClause' && node.param) bind(node.param);
}

function mutatesProtectedBinding(node: AssignmentExpression | UpdateExpression, bind: BindingRecorder): boolean {
  let assigned: Node = node.type === 'AssignmentExpression' ? node.left : node.argument;
  while (assigned.type === 'MemberExpression' || assigned.type === 'OptionalMemberExpression')
    assigned = assigned.object;
  if (assigned.type === 'Identifier') return protectedNames.has(assigned.name);
  return (assigned.type === 'ObjectPattern' || assigned.type === 'ArrayPattern') && bind(assigned);
}

function collectBoundaryImports(statement: ImportDeclaration, imported: Map<string, string>): void {
  if (statement.importKind === 'type') return;
  for (const specifier of statement.specifiers) {
    if (specifier.type === 'ImportDefaultSpecifier' && specifier.local.name === 'path')
      imported.set('path', statement.source.value);
    if (
      specifier.type === 'ImportSpecifier' &&
      specifier.importKind !== 'type' &&
      specifier.imported.type === 'Identifier' &&
      specifier.imported.name === specifier.local.name
    )
      imported.set(specifier.local.name, statement.source.value);
  }
}

function collectBoundaryDeclarations(program: Program | null): BoundaryDeclarations {
  const functions = new Map<string, FunctionDeclaration>();
  const constants = new Map<string, VariableDeclaration>();
  const imported = new Map<string, string>();
  for (const statement of program?.body ?? []) {
    if (statement.type === 'FunctionDeclaration' && statement.id) functions.set(statement.id.name, statement);
    if (statement.type === 'VariableDeclaration')
      for (const declaration of statement.declarations)
        if (declaration.id.type === 'Identifier') constants.set(declaration.id.name, statement);
    if (statement.type === 'ImportDeclaration') collectBoundaryImports(statement, imported);
  }
  return { functions, constants, imported };
}

function hasClosedBoundaryReferences(
  functions: ReadonlyMap<string, FunctionDeclaration>,
  constants: ReadonlyMap<string, VariableDeclaration>,
  callReferences: readonly Identifier[],
): boolean {
  const expectedReferences = new Set<Node>([...finiteCallees].flatMap((name) => functions.get(name)?.id ?? []));
  const register = (value: Node | null | undefined): void => {
    if (value?.type === 'CallExpression' && value.callee.type === 'Identifier' && finiteCallees.has(value.callee.name))
      expectedReferences.add(value.callee);
  };
  register(initializer(functions.get('fsSafePackageTreeHash'), 0));
  register(initializer(functions.get('matchesAttestedNativeBinding'), 1));
  const attested = constants.get('fsSafePackageAttested')?.declarations[0]?.init;
  if (attested?.type === 'BinaryExpression') register(attested.left);
  for (const name of ['loadLinuxNativeBinding', 'loadWindowsNativeBinding']) {
    const still = initializer(functions.get(name), 4);
    if (still?.type === 'LogicalExpression' && still.right.type === 'BinaryExpression') register(still.right.left);
  }
  return (
    expectedReferences.size === 7 &&
    callReferences.length === expectedReferences.size &&
    !callReferences.some((node) => !expectedReferences.has(node))
  );
}

export function createFsSafeNativeImportBoundary(
  tree: Node,
  file: string,
): {
  readonly observe: (node: Node) => void;
  readonly finish: () => ReadonlySet<CallExpression>;
} {
  if (file !== 'vida-agent/src/config/safe-repository-access.ts') return { observe: () => {}, finish: () => new Set() };
  const program = tree.type === 'File' ? tree.program : tree.type === 'Program' ? tree : null;
  const { functions, constants, imported } = collectBoundaryDeclarations(program);
  const counts = new Map<string, number>();
  let ambiguous = false;
  const callReferences: Identifier[] = [];
  const bind: BindingRecorder = (node) => {
    let protectedBinding = false;
    for (const name of runtimeBindingNames(node))
      if (protectedNames.has(name)) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
        protectedBinding = true;
      }
    return protectedBinding;
  };
  const observe = (node: Node): void => {
    if (node.type === 'Identifier' && finiteCallees.has(node.name)) callReferences.push(node);
    recordDeclarationBindings(node, bind);
    recordCallableBindings(node, bind);
    if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression')
      if (mutatesProtectedBinding(node, bind)) ambiguous = true;
  };
  const property = (name: string, value: Pattern): Pattern => ({
    type: 'ObjectProperty',
    computed: false,
    key: id(name),
    value,
  });
  const arrow = (params: string[], body: Pattern): Pattern => ({
    type: 'ArrowFunctionExpression',
    async: false,
    params: params.map(id),
    body,
  });
  const digestHash = call(member(call(id('createHash'), text('sha256')), 'update'), id('bytes'));
  const frame = [
    member(id('file'), 'logical'),
    text('\0'),
    member(id('bytes'), 'byteLength'),
    text('\0'),
    id('fileHash'),
    text('\0'),
  ].reduce((left, right) => binary('+', left, right), text('file\0'));
  const treeHashBody: Pattern[] = [
    variable('nativeRoot', call(id('resolveFsSafeNativePackageRoot'), id('root'), id('nativeTarget'))),
    variable(
      'files',
      call(
        member(
          {
            type: 'ArrayExpression',
            elements: [
              {
                type: 'SpreadElement',
                argument: call(
                  member(id('fsSafePackageManifest'), 'map'),
                  arrow(['relative'], {
                    type: 'ObjectExpression',
                    properties: [
                      property('root', id('root')),
                      property('relative', id('relative')),
                      property('logical', id('relative')),
                    ],
                  }),
                ),
              },
              {
                type: 'SpreadElement',
                argument: call(
                  member(
                    { type: 'ArrayExpression', elements: [text('package.json'), text('fs-safe-native.node')] },
                    'map',
                  ),
                  arrow(['relative'], {
                    type: 'ObjectExpression',
                    properties: [
                      property('root', id('nativeRoot')),
                      property('relative', id('relative')),
                      property(
                        'logical',
                        binary(
                          '+',
                          binary('+', binary('+', text('native/'), id('nativeTarget')), text('/')),
                          id('relative'),
                        ),
                      ),
                    ],
                  }),
                ),
              },
            ],
          },
          'sort',
        ),
        arrow(['left', 'right'], {
          type: 'ConditionalExpression',
          test: binary('<', member(id('left'), 'logical'), member(id('right'), 'logical')),
          consequent: unary('-', { type: 'NumericLiteral', value: 1 }),
          alternate: call(id('Number'), binary('>', member(id('left'), 'logical'), member(id('right'), 'logical'))),
        }),
      ),
    ),
    variable('digest', call(id('createHash'), text('sha256'))),
    {
      type: 'VariableDeclaration',
      kind: 'let',
      declarations: [{ type: 'VariableDeclarator', id: id('totalBytes'), init: { type: 'NumericLiteral', value: 0 } }],
    },
    expression(
      call(
        member(id('files'), 'forEach'),
        arrow(['file'], {
          type: 'BlockStatement',
          body: [
            variable(
              'bytes',
              call(id('readFsSafePackageFile'), member(id('file'), 'root'), member(id('file'), 'relative')),
            ),
            expression({
              type: 'AssignmentExpression',
              operator: '+=',
              left: id('totalBytes'),
              right: member(id('bytes'), 'byteLength'),
            }),
            reject(binary('>', id('totalBytes'), id('fsSafePackageMaxBytes')), 'fs-safe package size bound exceeded'),
            variable('fileHash', call(member(digestHash, 'digest'), text('hex'))),
            expression(call(member(id('digest'), 'update'), frame)),
          ],
        }),
      ),
    ),
    returned(call(member(id('digest'), 'digest'), text('hex'))),
  ];
  const readerBody: Pattern[] = [
    variable(
      'opened',
      call(id('openRootFileSync'), {
        type: 'ObjectExpression',
        properties: [
          property('absolutePath', call(member(id('path'), 'join'), id('root'), id('relative'))),
          property('rootPath', id('root')),
          property('rootRealPath', id('root')),
          property('boundaryLabel', text('fs-safe package attestation')),
          property('maxBytes', id('fsSafePackageMaxBytes')),
          property('rejectHardlinks', { type: 'BooleanLiteral', value: false }),
          property('rejectSymlinks', { type: 'BooleanLiteral', value: true }),
          property('allowedType', text('file')),
        ],
      }),
    ),
    {
      type: 'IfStatement',
      test: unary('!', member(id('opened'), 'ok')),
      consequent: expression(call(id('fail'), binary('+', text('fs-safe package file is unsafe: '), id('relative')))),
      alternate: null,
    },
    {
      type: 'TryStatement',
      block: { type: 'BlockStatement', body: [returned(call(id('readFileSync'), member(id('opened'), 'fd')))] },
      handler: null,
      finalizer: { type: 'BlockStatement', body: [expression(call(id('closeSync'), member(id('opened'), 'fd')))] },
    },
  ];
  const finish = (): ReadonlySet<CallExpression> => {
    const allowed = new Set<CallExpression>();
    if (
      ambiguous ||
      [...globals, ...helpers, ...imports.keys()].some((name) => counts.get(name) !== 1) ||
      ['Number', 'Boolean', 'JSON', 'process'].some((name) => counts.has(name)) ||
      [...imports].some(([name, source]) => imported.get(name) !== source)
    )
      return allowed;
    if (
      !matches(
        constants.get('moduleRequire'),
        variable(
          'moduleRequire',
          call(id('createRequire'), {
            type: 'MemberExpression',
            computed: false,
            object: { type: 'MetaProperty', meta: id('import'), property: id('meta') },
            property: id('url'),
          }),
        ),
      ) ||
      !matches(
        constants.get('fsSafePackageRoot'),
        variable('fsSafePackageRoot', call(id('resolveFsSafePackageRoot'))),
      ) ||
      !matches(
        constants.get('fsSafePackageNativeTarget'),
        variable('fsSafePackageNativeTarget', call(id('fsSafeNativeTarget'))),
      ) ||
      !matches(
        constants.get('fsSafePackageAttested'),
        variable('fsSafePackageAttested', binary('===', treeHash, digest)),
      )
    )
      return allowed;
    if (
      !functionMatches(
        functions.get('resolveFsSafePackageRoot'),
        [],
        [
          variable(
            'entry',
            call(id('realpathSync'), call(member(id('moduleRequire'), 'resolve'), text('@openclaw/fs-safe'))),
          ),
          variable(
            'root',
            call(member(id('path'), 'resolve'), call(member(id('path'), 'dirname'), id('entry')), text('..')),
          ),
          variable('metadata', metadata(id('root'))),
          reject(
            call(
              id('any'),
              binary('!==', member(id('metadata'), 'name'), text('@openclaw/fs-safe')),
              binary('!==', member(id('metadata'), 'version'), id('fsSafeVersion')),
            ),
            'fs-safe package identity is invalid',
          ),
          returned(id('root')),
        ],
      ) ||
      !functionMatches(
        functions.get('resolveFsSafeNativePackageRoot'),
        ['root', 'nativeTarget'],
        [
          variable('name', binary('+', text('@openclaw/fs-safe-'), id('nativeTarget'))),
          variable(
            'packageRequire',
            call(id('createRequire'), call(member(id('path'), 'join'), id('root'), text('dist'), text('native.js'))),
          ),
          variable('entry', call(id('realpathSync'), call(member(id('packageRequire'), 'resolve'), id('name')))),
          variable('nativeRoot', call(member(id('path'), 'dirname'), id('entry'))),
          variable('metadata', metadata(id('nativeRoot'))),
          reject(
            call(
              id('any'),
              binary('!==', member(id('metadata'), 'name'), id('name')),
              binary('!==', member(id('metadata'), 'version'), id('fsSafeVersion')),
              binary('!==', member(id('metadata'), 'main'), text('fs-safe-native.node')),
            ),
            'fs-safe native package identity is invalid',
          ),
          reject(
            binary('!==', id('entry'), call(member(id('path'), 'join'), id('nativeRoot'), text('fs-safe-native.node'))),
            'fs-safe native entry is invalid',
          ),
          returned(id('nativeRoot')),
        ],
      ) ||
      !functionMatches(
        functions.get('matchesAttestedNativeBinding'),
        ['binding', 'packageStillAttested'],
        [
          {
            type: 'IfStatement',
            test: logical('||', unary('!', id('packageStillAttested')), unary('!', id('binding'))),
            consequent: returned({ type: 'BooleanLiteral', value: false }),
            alternate: null,
          },
          variable('nativeRoot', call(id('resolveFsSafeNativePackageRoot'), root, target)),
          returned(
            binary(
              '===',
              id('binding'),
              call(
                id('moduleRequire'),
                call(member(id('path'), 'join'), id('nativeRoot'), text('fs-safe-native.node')),
              ),
            ),
          ),
        ],
      )
    )
      return allowed;
    if (
      !functionMatches(functions.get('fsSafePackageTreeHash'), ['root', 'nativeTarget'], treeHashBody) ||
      !functionMatches(functions.get('readFsSafePackageFile'), ['root', 'relative'], readerBody) ||
      !matches(
        constants.get('fsSafePackageMaxBytes'),
        variable(
          'fsSafePackageMaxBytes',
          binary('*', binary('*', { type: 'NumericLiteral', value: 64 }, { type: 'NumericLiteral', value: 1024 }), {
            type: 'NumericLiteral',
            value: 1024,
          }),
        ),
      )
    )
      return allowed;
    // Pin the finite supported platform table; the libc selector is a boolean
    // converted to 0/1, so it cannot introduce a foreign native package suffix.
    const targetFn = functions.get('fsSafeNativeTarget');
    if (
      !functionMatches(
        targetFn,
        [],
        [
          variable('report', {
            type: 'ConditionalExpression',
            test: binary('===', member(id('process'), 'platform'), text('linux')),
            consequent: {
              type: 'OptionalCallExpression',
              optional: true,
              arguments: [],
              callee: {
                type: 'OptionalMemberExpression',
                computed: false,
                optional: true,
                object: member(id('process'), 'report'),
                property: id('getReport'),
              },
            },
            alternate: id('undefined'),
          }),
          variable('libc', {
            type: 'MemberExpression',
            computed: true,
            object: { type: 'ArrayExpression', elements: [text('musl'), text('gnu')] },
            property: call(
              id('Number'),
              call(id('Boolean'), {
                type: 'OptionalMemberExpression',
                computed: false,
                optional: true,
                object: {
                  type: 'OptionalMemberExpression',
                  computed: false,
                  optional: true,
                  object: id('report'),
                  property: id('header'),
                },
                property: id('glibcVersionRuntime'),
              }),
            ),
          }),

          variable('targets', {
            type: 'ObjectExpression',
            properties: [
              { type: 'ObjectProperty', computed: false, key: text('win32-x64'), value: text('win32-x64-msvc') },
              {
                type: 'ObjectProperty',
                computed: false,
                key: text('linux-x64'),
                value: binary('+', text('linux-x64-'), id('libc')),
              },
              {
                type: 'ObjectProperty',
                computed: false,
                key: text('linux-arm64'),
                value: binary('+', text('linux-arm64-'), id('libc')),
              },
            ],
          }),
          variable('target', {
            type: 'MemberExpression',
            computed: true,
            object: id('targets'),
            property: binary(
              '+',
              binary('+', member(id('process'), 'platform'), text('-')),
              member(id('process'), 'arch'),
            ),
          }),
          reject(unary('!', id('target')), 'fs-safe native target is unsupported'),
          returned(id('target')),
        ],
      )
    )
      return allowed;
    for (const [name, platform, methods] of [
      ['loadLinuxNativeBinding', 'linux', ['cloneFileExclusive', 'renameNoReplace', 'renameReplace']],
      [
        'loadWindowsNativeBinding',
        'win32',
        ['renameNoReplace', 'renameReplace', 'openBeneath', 'mkdirBeneath', 'fstatIdentity', 'sha256File'],
      ],
    ] as const) {
      const fn = functions.get(name);
      const still = id('packageStillAttested');
      if (
        !functionMatches(
          fn,
          [],
          [
            {
              type: 'IfStatement',
              test: logical(
                '||',
                unary('!', id('fsSafePackageAttested')),
                binary('!==', member(id('process'), 'platform'), text(platform)),
              ),
              consequent: returned(id('undefined')),
              alternate: null,
            },
            variable(
              'nativeModule',
              call(id('moduleRequire'), call(member(id('path'), 'join'), root, text('dist'), text('native.js'))),
            ),
            variable('binding', {
              type: 'OptionalCallExpression',
              optional: true,
              callee: member(id('nativeModule'), 'getNativeBinding'),
              arguments: [],
            }),
            variable('expected', digest),
            variable(
              'packageStillAttested',
              logical('&&', binary('!==', id('expected'), id('undefined')), binary('===', treeHash, id('expected'))),
            ),
            variable(
              'available',
              call(
                id('all'),
                ...(platform === 'linux' ? [binary('===', member(id('process'), 'platform'), text('linux'))] : []),
                still,
                call(id('matchesAttestedNativeBinding'), id('binding'), still),
                ...methods.map((method) =>
                  binary(
                    '===',
                    unary('typeof', {
                      type: 'OptionalMemberExpression',
                      optional: true,
                      computed: false,
                      object: id('binding'),
                      property: id(method),
                    }),
                    text('function'),
                  ),
                ),
              ),
            ),
            returned({
              type: 'MemberExpression',
              computed: true,
              object: { type: 'ArrayExpression', elements: [id('undefined'), id('binding')] },
              property: call(id('Number'), id('available')),
            }),
          ],
        )
      )
        return new Set();
      const load = erased(initializer(fn, 1));
      if (object(load) && load.type === 'CallExpression') allowed.add(load as unknown as CallExpression);
    }
    const resolution = erased(initializer(functions.get('resolveFsSafeNativePackageRoot'), 2));
    const identity = functions.get('matchesAttestedNativeBinding')?.body.body[2];
    const firstArgument: unknown =
      object(resolution) && Array.isArray(resolution.arguments) ? resolution.arguments[0] : undefined;
    if (object(firstArgument) && firstArgument.type === 'CallExpression')
      allowed.add(firstArgument as unknown as CallExpression);
    if (
      identity?.type === 'ReturnStatement' &&
      identity.argument?.type === 'BinaryExpression' &&
      identity.argument.right.type === 'CallExpression'
    )
      allowed.add(identity.argument.right);
    if (!hasClosedBoundaryReferences(functions, constants, callReferences)) return new Set();
    return allowed;
  };
  return { observe, finish };
}
