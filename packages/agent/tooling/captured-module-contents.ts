/** Decode captured text as UTF-8 before Bun consumes it; binary loaders retain the exact bytes. */
export function capturedModuleContents(bytes: Uint8Array, loader: Bun.Loader): string | Uint8Array {
  if (loader === 'file' || loader === 'napi' || loader === 'wasm') return bytes;
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
