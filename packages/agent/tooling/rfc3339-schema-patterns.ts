import { UTC_LEAP_SECOND_DATES } from '../src/contracts/public-ingress.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function rfc3339LeapSecondAlternation(utcDates: readonly string[]): string {
  const two = (value: number) => String(value).padStart(2, '0');
  const dates = (values: readonly string[]) => `(?:${values.join('|')})`;
  const nextDay = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const leap = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day! < days[month! - 1]!) return `${year}-${two(month!)}-${two(day! + 1)}`;
    return month! < 12 ? `${year}-${two(month! + 1)}-01` : `${year! + 1}-01-01`;
  };
  const fraction = String.raw`(?:\.\d{1,9})?`;
  const anyHour = String.raw`(?:[01]\d|2[0-3])`;
  const anyMinute = String.raw`[0-5]\d`;
  const nonzeroMinute = String.raw`(?:0[1-9]|[1-5]\d)`;
  const positiveHours = Array.from({ length: 24 }, (_, offsetHour) => {
    const hh = two(offsetHour),
      noCarryHour = two((23 + offsetHour) % 24);
    const zeroMinute = offsetHour === 0 ? '' : `${noCarryHour}:59:60${fraction}\\+${hh}:00|`;
    return `(?:${zeroMinute}${hh}:${anyMinute}:60${fraction}\\+${hh}:${nonzeroMinute})`;
  });
  const positiveMinutes = Array.from({ length: 60 }, (_, localMinute) => {
    const offsetMinute = localMinute === 59 ? 0 : localMinute + 1;
    return `${anyHour}:${two(localMinute)}:60${fraction}\\+${anyHour}:${two(offsetMinute)}`;
  });
  const negativeHours = Array.from({ length: 24 }, (_, offsetHour) => {
    const hh = two(offsetHour),
      localHour = two(23 - offsetHour);
    const minute = offsetHour === 0 ? nonzeroMinute : anyMinute;
    return `${localHour}:${anyMinute}:60${fraction}-${hh}:${minute}`;
  });
  const negativeMinutes = Array.from(
    { length: 60 },
    (_, offsetMinute) => `${anyHour}:${two(59 - offsetMinute)}:60${fraction}-${anyHour}:${two(offsetMinute)}`,
  );
  const utc = dates(utcDates),
    localNextDay = dates(utcDates.map(nextDay));
  const positive = `${localNextDay}T(?=${positiveHours.join('|')})(?=${positiveMinutes.join('|')})${anyHour}:${anyMinute}:60${fraction}\\+${anyHour}:${anyMinute}`;
  const negative = `${utc}T(?=${negativeHours.join('|')})(?=${negativeMinutes.join('|')})${anyHour}:${anyMinute}:60${fraction}-${anyHour}:${anyMinute}`;
  return `(?:${utc}T23:59:60${fraction}(?:Z|[+-]00:00)|${positive}|${negative})`;
}

/** Updates only the legacy leap-second alternation; all other pattern bytes stay intact. */
export function updateLeapSecondSchemaPatterns(value: unknown): readonly (readonly [string, string])[] {
  const dateGroup = `(?:${UTC_LEAP_SECOND_DATES.join('|')})`;
  const time = String.raw`T23:59:60(?:\.\d{1,9})?(?:Z|\+00:00)`;
  const legacy = [`${dateGroup}${time}`, `(?:${dateGroup})${time}`];
  const replacement = rfc3339LeapSecondAlternation(UTC_LEAP_SECOND_DATES);
  const replacements: [string, string][] = [];
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if ('pattern' in node && typeof node.pattern === 'string') {
      for (const previous of legacy) {
        if (!node.pattern.includes(previous)) continue;
        const next = node.pattern.replace(previous, replacement);
        replacements.push([node.pattern, next]);
        node.pattern = next;
        break;
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(value);
  return replacements;
}

if (import.meta.main) {
  const root = fileURLToPath(new URL('../schemas/', import.meta.url));
  let changed = 0;
  let configSchemaSha: string | undefined;
  for await (const name of new Bun.Glob('*.schema.json').scan(root)) {
    const file = path.join(root, name);
    let text = await Bun.file(file).text();
    const schema: unknown = JSON.parse(text);
    const replacements = updateLeapSecondSchemaPatterns(schema);
    if (replacements.length === 0) continue;
    for (const [before, after] of new Map(replacements))
      text = text.replaceAll(JSON.stringify(before), JSON.stringify(after));
    await Bun.write(file, text);
    if (name === 'agent-runtime-config.v1.schema.json')
      configSchemaSha = createHash('sha256').update(text).digest('hex');
    changed += replacements.length;
    console.log(`${name}: ${replacements.length} timestamp patterns updated`);
  }
  if (configSchemaSha !== undefined) {
    const owner = fileURLToPath(new URL('../src/config/runtime-config.ts', import.meta.url));
    const source = await Bun.file(owner).text();
    const pin = /const CONFIG_SCHEMA_SHA256 = '[a-f0-9]{64}';/g;
    if ([...source.matchAll(pin)].length !== 1) throw new Error('Runtime config schema pin owner is ambiguous.');
    await Bun.write(owner, source.replace(pin, `const CONFIG_SCHEMA_SHA256 = '${configSchemaSha}';`));
  }
  console.log(`${changed} timestamp patterns updated`);
}
