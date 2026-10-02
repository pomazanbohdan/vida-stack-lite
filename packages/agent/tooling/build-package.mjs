import { readdir, readFile, stat, writeFile, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { expectedJavascriptFiles } from './maintained-source-inventory.mjs';

const candidateRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(candidateRoot, 'dist');
const distSourceRoot = path.join(distRoot, 'src');
const schemaNames = [
  'acceptance-manifest.v1.schema.json',
  'agent-runtime-config.v1.schema.json',
  'authorization-request.v1.schema.json',
  'coordination-ledger.v1.schema.json',
  'decision-record.v1.schema.json',
  'documentation-policy.v1.schema.json',
  'documentation-change-event.v1.schema.json',
  'documentation-clear-checkpoint.v1.schema.json',
  'governed-write-intent.v1.schema.json',
  'governed-write.v1.schema.json',
  'implementation-scope.v1.schema.json',
  'persistent-session-handoff-state.v1.schema.json',
  'instruction-activation-use.v1.schema.json',
  'instruction-registry.v1.schema.json',
  'research-result.v1.schema.json',
  'research-synthesis.v1.schema.json',
  'runtime-config-repair-inspection.v1.schema.json',
  'config-rebind-operation.v1.schema.json',
  'documentation-policy-transition.v1.schema.json',
  'runtime-envelope.v1.schema.json',
  'runtime-initialization.v1.schema.json',
  'work-state.v1.schema.json',
  'final-assurance-packet.v1.schema.json',
  'final-assurance-review.v1.schema.json',
  'final-assurance-reverse.v1.schema.json',
  'final-assurance-state.v1.schema.json',
  'workflow-attempt-recovery-decision.v1.schema.json',
];
const forbiddenTestIssuers = [
  'createTestRuntimeKernelHost',
  'createTestWorkflowHostCapability',
  'createTestFileWorkflowHostCapability',
  'createTestOperationReservationStore',
  'createTestGovernanceGuard',
  'createCompositionRootGovernanceGuard',
  'issueTestTrustedPathProfileOverride',
  'createTestTrustedHostLauncherCapability',
];
const forbiddenInternalDeclarations = [
  'createRuntimeKernelHostProofForCompositionRoot',
  'createWorkflowHostAuthenticationProofForCompositionRoot',
];

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(absolute)));
    else result.push(absolute);
  }
  return result;
}

function stripDeclaration(text, name) {
  const declaration = `export declare function ${name}(`;
  let output = text;
  for (;;) {
    const start = output.indexOf(declaration);
    if (start < 0) return output;
    const end = output.indexOf(';\n', start);
    if (end < 0) throw new Error(`unterminated declaration for ${name}`);
    let contentStart = start;
    const commentStart = output.lastIndexOf('/**', start);
    const lineStart = output.lastIndexOf('\n', start - 1) + 1;
    if (commentStart >= lineStart) contentStart = commentStart;
    output = output.slice(0, contentStart) + output.slice(end + 2);
  }
}
function stripExportAlias(text, name) {
  return text
    .split('\n')
    .filter((line) => !(line.trim().startsWith('export {') && line.includes(' as ' + name)))
    .join('\n');
}
const facadeNames = ['index', 'trusted-host'];
const transpiler = new Bun.Transpiler({ loader: 'ts' });
const facadeExports = await Promise.all(
  facadeNames.map(
    async (name) => transpiler.scan(await readFile(path.join(candidateRoot, 'src', name + '.ts'), 'utf8')).exports,
  ),
);
const exportedNames = facadeExports.flat();
if (new Set(exportedNames).size !== exportedNames.length) throw new Error('package entrypoint exports overlap');
const virtualEntry = path.join(candidateRoot, 'src', 'runtime.ts');
const build = await Bun.build({
  entrypoints: [virtualEntry],
  files: { [virtualEntry]: "export * from './index.js';\nexport * from './trusted-host.js';\n" },
  outdir: distSourceRoot,
  target: 'bun',
  format: 'esm',
  packages: 'external',
  env: 'disable',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  splitting: false,
  sourcemap: 'none',
  naming: 'runtime.js',
});
if (!build.success) {
  console.error(build.logs);
  throw new Error('candidate package build failed');
}
const runtimeExports = new Bun.Transpiler({ loader: 'js' }).scan(
  await readFile(path.join(distSourceRoot, 'runtime.js'), 'utf8'),
).exports;
if (runtimeExports.sort().join(',') !== exportedNames.sort().join(',')) {
  throw new Error('bundled runtime exports differ from the public entrypoint union');
}
for (const [index, name] of facadeNames.entries()) {
  await writeFile(
    path.join(distSourceRoot, name + '.js'),
    `export { ${facadeExports[index].join(', ')} } from './runtime.js';\n`,
    'utf8',
  );
}
for (const file of await filesUnder(distSourceRoot)) {
  if (!file.endsWith('.d.ts')) continue;
  let text = await readFile(file, 'utf8');
  forbiddenTestIssuers.forEach((name) => {
    text = stripDeclaration(text, name);
  });
  forbiddenInternalDeclarations.forEach((name) => {
    text = stripDeclaration(text, name);
    text = stripExportAlias(text, name);
  });
  const relative = path.relative(distSourceRoot, file).replaceAll('\\', '/');
  if (relative === 'runtime-kernel.d.ts') text = stripDeclaration(text, 'createRuntimeKernelHost');
  if (relative === 'governance/edictum-boundary.d.ts')
    text = stripDeclaration(text, 'createFileWorkflowHostCapability');
  await writeFile(file, text, 'utf8');
}

// Reconciliation source is repository-only until a functional artifact repair
// command is implemented and shipped with the bundle.
await rm(path.join(distSourceRoot, 'reconciliation'), { recursive: true, force: true });

await mkdir(path.join(distRoot, 'schemas'), { recursive: true });
for (const schemaName of schemaNames) {
  await copyFile(path.join(candidateRoot, 'schemas', schemaName), path.join(distRoot, 'schemas', schemaName));
}
await mkdir(path.join(distRoot, 'portable'), { recursive: true });
await copyFile(path.join(candidateRoot, 'bun.lock'), path.join(distRoot, 'portable', 'bun.lock'));

const required = [path.join(distSourceRoot, 'index.js'), path.join(distSourceRoot, 'trusted-host.js')];
for (const file of required) {
  const metadata = await stat(file);
  if (!metadata.isFile()) throw new Error(`package build did not create ${path.relative(candidateRoot, file)}`);
}
// The selector reader starts under Node before Bun routing. Its shared pure
// proof dependency must not import the bundled Bun/SQLite execution runtime.
const proofBuild = await Bun.build({
  entrypoints: [path.join(candidateRoot, 'src/documentation/transition-proof.ts')],
  outdir: path.join(distSourceRoot, 'documentation'),
  target: 'node',
  format: 'esm',
  packages: 'external',
  env: 'disable',
  splitting: false,
  sourcemap: 'none',
  naming: 'transition-proof.js',
});
if (!proofBuild.success) {
  console.error(proofBuild.logs);
  throw new Error('candidate pure proof build failed');
}
const javascriptFiles = (await filesUnder(distSourceRoot))
  .filter((file) => file.endsWith('.js'))
  .map((file) => path.relative(distSourceRoot, file).replaceAll('\\', '/'))
  .sort();
if (javascriptFiles.join(',') !== expectedJavascriptFiles.join(',')) {
  throw new Error(`package build emitted unpublished JavaScript: ${javascriptFiles.join(', ')}`);
}
const javascript = (
  await Promise.all(javascriptFiles.map((file) => readFile(path.join(distSourceRoot, file), 'utf8')))
).join('\n');
const shippedIssuer = forbiddenTestIssuers.find((name) => javascript.includes(name));
if (shippedIssuer) throw new Error(`package build leaked test-only issuer ${shippedIssuer}`);

console.log(
  JSON.stringify({
    schema: 'CandidatePackageBuild/v1',
    production_entrypoints: ['dist/src/index.js', 'dist/src/trusted-host.js'],
    test_issuers_shipped: false,
    schemas: schemaNames.length,
  }),
);
