export function callWithUntrustedArguments(target: (...args: never[]) => unknown, args: readonly unknown[]): unknown {
  const result: unknown = Reflect.apply(target, undefined, args);
  return result;
}
