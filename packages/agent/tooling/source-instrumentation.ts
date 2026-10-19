import { transformSync, type NodePath, type types } from '@babel/core';
import { programVisitor, type FileCoverageData } from 'istanbul-lib-instrument';

/** Adapt private methods only during Istanbul's synchronous public visitor. */
function enterWithPrivateMethods(path: NodePath<types.Program>, visitor: ReturnType<typeof programVisitor>): void {
  const methods: NodePath<types.Node>[] = [];
  path.traverse({
    ClassPrivateMethod(method) {
      methods.push(method);
    },
  });
  try {
    for (const method of methods) {
      method.node.type = 'ClassMethod';
      method.type = 'ClassMethod';
    }
    visitor.enter(path);
  } finally {
    for (const method of methods) {
      method.node.type = 'ClassPrivateMethod';
      method.type = 'ClassPrivateMethod';
    }
  }
}

/** Resolve Istanbul's coverage object once instead of calling its accessor at every counter hit. */
function cacheCoverageCounterTarget(code: string): string {
  const functionName = /\bfunction (cov_[A-Za-z0-9_$]+)\(\)\s*\{/u.exec(code)?.[1];
  if (!functionName) throw new Error('Coverage instrumentation has no Istanbul counter accessor.');
  const escapedFunctionName = functionName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const counterAccess = new RegExp(`\\b${escapedFunctionName}\\(\\)\\.([sfb])\\[`, 'gu');
  const probe = counterAccess.exec(code);
  if (!probe) return code;
  counterAccess.lastIndex = 0;

  let alias = `${functionName}_coverage`;
  while (code.includes(alias)) alias += '_';
  const bootstrap = `${functionName}();`;
  const bootstrapIndex = code.indexOf(bootstrap);
  if (bootstrapIndex < 0) throw new Error('Coverage instrumentation has no Istanbul bootstrap call.');
  const lineStart = code.lastIndexOf('\n', bootstrapIndex) + 1;
  const lineEnd = code.indexOf('\n', bootstrapIndex);
  if (code.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim() !== bootstrap)
    throw new Error('Coverage instrumentation Istanbul bootstrap call is not standalone.');
  let optimized = code.slice(0, lineStart) + `var ${alias} = ${bootstrap}` + (lineEnd < 0 ? '' : code.slice(lineEnd));
  return optimized.replace(counterAccess, (_match, counter: string) => `${alias}.${counter}[`);
}

/** One parse/generation; all counters use original Source locations. */
export function instrumentSource(
  file: string,
  source: string,
  observeOriginalAst?: (ast: unknown) => void,
): { code: string; fileCoverage: FileCoverageData } {
  let fileCoverage: FileCoverageData | undefined;
  const transformed = transformSync(source, {
    filename: file,
    configFile: false,
    babelrc: false,
    compact: false,
    comments: true,
    parserOpts: {
      sourceType: 'module',
      allowReturnOutsideFunction: false,
      plugins: ['typescript'],
    },
    plugins: [
      (api: { types: typeof types }) => {
        const visitor = programVisitor(api.types, file, { coverageVariable: '__vidaAgentCoverage__' });
        return {
          visitor: {
            Program: {
              enter(path: NodePath<types.Program>) {
                observeOriginalAst?.(path.node);
                enterWithPrivateMethods(path, visitor);
              },
              exit(path: NodePath<types.Program>) {
                fileCoverage = visitor.exit(path)?.fileCoverage;
              },
            },
          },
        };
      },
    ],
  });
  if (typeof transformed?.code !== 'string' || !fileCoverage)
    throw new Error('Source instrumentation did not produce a fresh coverage map: ' + file);
  return { code: cacheCoverageCounterTarget(transformed.code), fileCoverage: structuredClone(fileCoverage) };
}
