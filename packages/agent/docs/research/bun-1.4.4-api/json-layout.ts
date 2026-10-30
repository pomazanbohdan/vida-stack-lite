export function jsonLayout(value: Record<string, unknown>): string {
  const entries = Object.entries(value).map(([key, item]) => {
    const encoded = Array.isArray(item)
      ? item.length === 0
        ? '[]'
        : '[\n' + item.map((entry: unknown) => '    ' + JSON.stringify(entry)).join(',\n') + '\n  ]'
      : JSON.stringify(item);
    return '  ' + JSON.stringify(key) + ': ' + encoded;
  });
  return '{\n' + entries.join(',\n') + '\n}\n';
}
