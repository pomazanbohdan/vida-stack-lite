import path from 'node:path';

/** Returns PATH using the host platform's environment-key lookup rules. */
export function environmentPath(
  environment: Readonly<Record<string, string | undefined>>,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform !== 'win32') return environment.PATH ?? '';

  const key = Object.keys(environment)
    .filter((candidate) => candidate.toUpperCase() === 'PATH')
    .sort()[0];
  return key === undefined ? '' : (environment[key] ?? '');
}

/** Returns a copied environment with a directory prepended to its effective PATH. */
export function prependEnvironmentPath(
  environment: Readonly<Record<string, string | undefined>>,
  directory: string,
  platform: NodeJS.Platform = process.platform,
): Record<string, string | undefined> {
  const next = { ...environment };
  const current = environmentPath(environment, platform);
  if (platform === 'win32') {
    for (const key of Object.keys(next)) {
      if (key.toUpperCase() === 'PATH') delete next[key];
    }
  }
  const delimiter = platform === 'win32' ? path.win32.delimiter : path.posix.delimiter;
  next.PATH = `${directory}${delimiter}${current}`;
  return next;
}
