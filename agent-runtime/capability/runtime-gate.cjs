// Native host hooks can call this file, while GSD loop gates render the same
// point-specific checkpoint contract. The launcher is the fail-closed executor.
const fs = require('fs');
const path = require('path');
// This file is installed at <trusted repo>/.gsd/capabilities/<id>. Resolve
// from that location, never from an untrusted caller cwd. Reject a reparse
// point on the capability path or a runtime that escapes the trusted root.
function trustedRepositoryRoot() {
  const capability = fs.realpathSync(__dirname);
  const expected = `${path.sep}.gsd${path.sep}capabilities${path.sep}agent-development-runtime`;
  if (!capability.endsWith(expected)) throw new Error('DEGRADED: capability location is not trusted');
  const root = capability.slice(0, -expected.length);
  if (!root || !fs.statSync(root).isDirectory()) throw new Error('DEGRADED: trusted repository root unavailable');
  return root;
}
const repositoryRoot = trustedRepositoryRoot();
const runtimePath = path.resolve(repositoryRoot, 'agent-runtime', 'lib', 'runtime.cjs');
if (!runtimePath.startsWith(`${repositoryRoot}${path.sep}`) || !fs.existsSync(runtimePath) || fs.realpathSync(runtimePath) !== runtimePath) throw new Error('DEGRADED: portable runtime escapes trusted root');
const runtime = require(runtimePath);
function validate(input) {
  if (!input || typeof input !== 'object') throw new Error('typed gate input required');
  return runtime.validateGateFile({ ...input, repoRoot: repositoryRoot });
}
function seal(input) {
  if (!input || !input.checkpointPath || !Number.isInteger(input.expectedRevision) || !input.sourceRevision || !input.repoRoot) throw new Error('typed seal input required');
  if (path.resolve(input.repoRoot) !== repositoryRoot) throw new Error('DEGRADED: caller repository root conflicts with installed capability');
  const checkpointPath = runtime.checkpointPath({ checkpointPath: input.checkpointPath }, repositoryRoot);
  return runtime.sealMutation(checkpointPath, input.expectedRevision, input.sourceRevision, repositoryRoot);
}
module.exports = { validate, seal, repositoryRoot };
if (require.main === module) {
  const [verb, checkpointPath, expectedRevision, sourceRevision, point] = process.argv.slice(2);
  const input = { checkpointPath, expectedRevision: Number(expectedRevision), sourceRevision, repoRoot: repositoryRoot, point };
  const value = verb === 'seal' ? seal(input) : verb === 'validate' ? validate(input) : null;
  if (!value) throw new Error('unsupported capability verb');
  console.log(JSON.stringify({ revision: value.revision, lifecycle_state: value.lifecycle_state, implementation_fingerprint: value.implementation_fingerprint }));
}
