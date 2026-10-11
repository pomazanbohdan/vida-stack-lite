/** Read caught error data without assigning runtime authority. */
export function readCliErrorProperty(error: unknown, key: string): unknown {
  return error !== null && (typeof error === 'object' || typeof error === 'function')
    ? Reflect.get(error, key)
    : undefined;
}
