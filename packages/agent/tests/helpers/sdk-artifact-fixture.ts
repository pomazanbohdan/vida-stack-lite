import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sha256 } from '../../tooling/bun-coverage-evidence.ts';
import { expectedJavascriptFiles } from '../../tooling/maintained-source-inventory.ts';

type SdkArtifactIdentity = { schema: string; purpose?: string };

export function sdkArtifactFixture(
  root: string,
  identity: SdkArtifactIdentity = { schema: 'CandidatePackageBuild/v1' },
) {
  const outputs = expectedJavascriptFiles.map((file, index) => ({
    path: `dist/src/${file}`,
    bytes: Buffer.from(`export const member${index} = ${index};\n`),
  }));
  const selectedInputs = new Map<string, Buffer>([
    ['.bun-version', Buffer.from(`${Bun.version}\n`)],
    ['bun.lock', Buffer.from('lock fixture\n')],
    ['package.json', Buffer.from(JSON.stringify({ version: '1.2.3', engines: { node: '24.x' } }))],
    ['src/index.ts', Buffer.from('export const index = true;\n')],
    ['src/nested/transitive.ts', Buffer.from('export const nested = true;\n')],
    ['src/trusted-host.ts', Buffer.from('export const trustedHost = true;\n')],
    ['tooling/build-package.ts', Buffer.from('export const builder = true;\n')],
  ]);
  for (const [relative, bytes] of selectedInputs) {
    const destination = path.join(root, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
  }
  for (const output of outputs) {
    const destination = path.join(root, output.path);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, output.bytes);
  }
  const receipt = () => ({
    schema: identity.schema,
    ...(identity.purpose === undefined ? {} : { purpose: identity.purpose }),
    version: '1.2.3',
    declared_node_engine: '24.x',
    declaration_runtime: 'bun',
    bun_version: Bun.version,
    production_entrypoints: ['dist/src/index.js', 'dist/src/trusted-host.js'],
    test_issuers_shipped: false,
    schemas: 1,
    inputs: [...selectedInputs].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) })),
    outputs: outputs.map(({ path: file, bytes }) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) })),
    virtual_runtime_entry: { path: 'src/runtime.ts', sha256: 'a'.repeat(64) },
    dependency_custody:
      'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.',
  });
  const writeReceipt = (value = receipt()) => {
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    writeFileSync(path.join(root, 'dist/sdk-formation.json'), JSON.stringify(value) + '\n');
  };
  writeReceipt();
  const artifacts = () =>
    new Map<string, Buffer>([
      ['dist/sdk-formation.json', Buffer.from(JSON.stringify(receipt()) + '\n')],
      ...outputs.map(({ path: file, bytes }) => [file, Buffer.from(bytes)] as const),
    ]);
  return { outputs, selectedInputs, receipt, writeReceipt, artifacts };
}
