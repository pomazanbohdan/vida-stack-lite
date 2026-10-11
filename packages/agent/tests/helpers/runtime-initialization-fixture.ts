import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import initializationSchema from '../../schemas/runtime-initialization.v1.schema.json' with { type: 'json' };
import type { RuntimeInitializationReceipt } from '../../src/config/initialization-record.js';

/** Bind controlled fixture outputs to the actual current schema and bundle bytes. */
export function fixtureInitializationTemplates(
  repositoryRoot: string,
  bundleRoot: string,
): RuntimeInitializationReceipt['templates'] {
  return initializationSchema.properties.templates.prefixItems.map(({ properties }) => {
    const template = properties.template.const;
    const output = properties.output.const;
    return {
      template,
      output,
      template_sha256: createHash('sha256')
        .update(readFileSync(path.join(bundleRoot, template)))
        .digest('hex'),
      output_sha256: createHash('sha256')
        .update(readFileSync(path.join(repositoryRoot, output)))
        .digest('hex'),
    };
  });
}
