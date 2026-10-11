/**
 * Return Bun's runtime-object representation of a captured JSON module.
 * Object JSON values expose the whole value as `default` and each own JSON
 * property except `default` as a named export. Other JSON values expose the
 * observed native namespace marker and `default`.
 */
export function capturedJsonModule(bytes: Uint8Array): Bun.OnLoadResultObject {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value: unknown = JSON.parse(text);
  const exports: Record<string, unknown> =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.fromEntries([...Object.entries(value).filter(([key]) => key !== 'default'), ['default', value]])
      : { __esModule: true, default: value };

  return { loader: 'object', exports };
}
