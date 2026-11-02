import { transformSync } from '@babel/core';
import { programVisitor, type FileCoverageData, type ProgramPath } from 'istanbul-lib-instrument';

type MutablePrivateMethodPath = {
  node: { type: 'ClassPrivateMethod' | 'ClassMethod' };
  type: 'ClassPrivateMethod' | 'ClassMethod';
};

/** Adapt private methods only during Istanbul's synchronous public visitor. */
function enterWithPrivateMethods(path: ProgramPath, visitor: ReturnType<typeof programVisitor>): void {
  const methods: MutablePrivateMethodPath[] = [];
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
      (api) => {
        const visitor = programVisitor(api.types, file, { coverageVariable: '__vidaAgentCoverage__' });
        return {
          visitor: {
            Program: {
              enter(path: ProgramPath) {
                observeOriginalAst?.(path.node);
                enterWithPrivateMethods(path, visitor);
              },
              exit(path: ProgramPath) {
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
  return { code: transformed.code, fileCoverage: structuredClone(fileCoverage) };
}
