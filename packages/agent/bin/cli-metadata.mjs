export const installerProtectedFiles = [
  'package.json',
  'bun.lock',
  '.bun-version',
  'bin/bun.mjs',
  'bin/init.mjs',
  'bin/install.mjs',
];

export const commands = new Set([
  'run',
  'init',
  'install',
  'reconcile-artifacts',
  'documentation-clear',
  'scope',
  'development-controller',
]);

export function cliMetadataResult(argv, manifest) {
  const [command, ...args] = argv;
  if (command === 'help' || command === '--help') {
    if (args.length) throw Error('help accepts no arguments');
    return {
      schema: 'VidaAgentCommandResult/v1',
      status: 'help',
      commands: [...commands, 'instructions', 'version'],
      run: 'run --project-root ABSOLUTE --repository ID --project ID --work-path RELATIVE --work-id ID --attempt NUMBER --team ID --kind KIND --intent INTENT --workflow ID [--scope-path RELATIVE ... | --scope-digest RETURNED_BINDING] [--intake ABSOLUTE_ACCEPTED_INTAKE_JSON]',
      scope: 'scope --project-root ABSOLUTE --repository ID --project ID --path RELATIVE [--path RELATIVE]',
      authority:
        'Scope inspection derives evidence; intake requires actual attributed work, scope and acceptance. Neither grants approval or authenticates native observations.',
    };
  }
  if (command === 'version') {
    if (args.length) throw Error('version accepts no arguments');
    return { schema: 'VidaAgentPackage/v1', name: manifest.name, version: manifest.version };
  }
  return null;
}

export const cliErrorResult = (error) => ({
  schema: 'VidaAgentCommandResult/v1',
  status: 'blocked',
  code: 'GAP-VIDA-CLI-001',
  message: error.message,
});
