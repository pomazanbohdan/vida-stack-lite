import type { ParserPlugin } from '@babel/parser';

/** Plain TS allows angle assertions; only JSX filenames enable JSX syntax. */
export function typescriptSyntaxPlugins(file: string): ParserPlugin[] {
  return /\.[jt]sx$/iu.test(file) ? ['typescript', 'jsx'] : ['typescript'];
}
