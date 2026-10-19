export type Schema = {
  readonly [keyword: string]: unknown;
};

export const SUPPORTED_KEYWORDS: readonly string[] = [
  'type', 'required', 'properties', 'additionalProperties', 'enum', 'const', 'pattern',
  'minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'items',
  '$ref', 'allOf', 'if', 'then', 'not', 'definitions', 'title', 'description',
];

const knownTypes = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);
const supported = new Set(SUPPORTED_KEYWORDS);
function compilePattern(pattern: string): RegExp | undefined {
  try { return new RegExp(pattern, 'u'); } catch {
    try { return new RegExp(pattern); } catch { return undefined; }
  }
}
const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isTypeName(value: unknown): value is string {
  return typeof value === 'string' && knownTypes.has(value);
}

function invalidKeywordValues(schema: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const invalid = (keyword: string): void => {
    errors.push(`invalid schema keyword value: ${keyword}`);
  };
  for (const keyword of Object.keys(schema)) {
    if (!supported.has(keyword) && keyword !== '$schema' && keyword !== '$id') {
      errors.push(`unsupported schema keyword: ${keyword}`);
    }
  }
  if (hasOwn(schema, 'type')) {
    const valid = isTypeName(schema.type) ||
      (Array.isArray(schema.type) && schema.type.length > 0 && schema.type.every(isTypeName));
    if (!valid) invalid('type');
  }
  if (hasOwn(schema, 'required') && (!Array.isArray(schema.required) || !schema.required.every((key) => typeof key === 'string'))) invalid('required');
  if (hasOwn(schema, 'properties') && (!isRecord(schema.properties) || !Object.values(schema.properties).every(isRecord))) invalid('properties');
  if (hasOwn(schema, 'additionalProperties') && schema.additionalProperties !== false && !isRecord(schema.additionalProperties)) invalid('additionalProperties');
  if (hasOwn(schema, 'enum') && !Array.isArray(schema.enum)) invalid('enum');
  if (hasOwn(schema, 'pattern') && typeof schema.pattern !== 'string') invalid('pattern');
  for (const keyword of ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems']) {
    if (hasOwn(schema, keyword) && (typeof schema[keyword] !== 'number' || !Number.isFinite(schema[keyword]))) invalid(keyword);
  }
  if (hasOwn(schema, 'items') && !isRecord(schema.items)) invalid('items');
  if (hasOwn(schema, '$ref') && typeof schema.$ref !== 'string') invalid('$ref');
  if (hasOwn(schema, 'allOf') && (!Array.isArray(schema.allOf) || !schema.allOf.every(isRecord))) invalid('allOf');
  if (hasOwn(schema, 'if') && !isRecord(schema.if)) invalid('if');
  if (hasOwn(schema, 'then') && !isRecord(schema.then)) invalid('then');
  if (hasOwn(schema, 'not') && !isRecord(schema.not)) invalid('not');
  if (hasOwn(schema, 'definitions') && (!isRecord(schema.definitions) || !Object.values(schema.definitions).every(isRecord))) invalid('definitions');
  return errors;
}

function inspectSchema(
  schema: unknown,
  root: Schema,
  activeSchemas: Set<object>,
  refStack: Set<string>,
): string[] {
  if (!isRecord(schema)) return ['schema must be an object'];
  if (activeSchemas.has(schema)) return [];
  activeSchemas.add(schema);
  const errors = invalidKeywordValues(schema);

  if (typeof schema.pattern === 'string') {
    if (compilePattern(schema.pattern) === undefined) errors.push(`invalid schema pattern: ${schema.pattern}`);
  }

  if (typeof schema.$ref === 'string') {
    const reference = schema.$ref;
    if (refStack.has(reference)) errors.push(`cyclic schema reference: ${reference}`);
    const match = /^#\/definitions\/([^/]+)$/.exec(reference);
    if (!match) errors.push(`unsupported schema reference: ${schema.$ref}`);
    else {
      const name = match[1];
      if (name === undefined || !isRecord(root.definitions) || !hasOwn(root.definitions, name)) {
        errors.push(`unresolved schema reference: ${schema.$ref}`);
      } else if (!refStack.has(reference)) {
        const nextRefStack = new Set(refStack);
        nextRefStack.add(reference);
        errors.push(...inspectSchema(root.definitions[name], root, new Set<object>(), nextRefStack));
      }
    }
  }

  if (isRecord(schema.properties) && Object.values(schema.properties).every(isRecord)) {
    for (const child of Object.values(schema.properties)) errors.push(...inspectSchema(child, root, activeSchemas, refStack));
  }
  if (schema.additionalProperties !== false && isRecord(schema.additionalProperties)) {
    errors.push(...inspectSchema(schema.additionalProperties, root, activeSchemas, refStack));
  }
  if (isRecord(schema.items)) errors.push(...inspectSchema(schema.items, root, activeSchemas, refStack));
  if (Array.isArray(schema.allOf) && schema.allOf.every(isRecord)) for (const branch of schema.allOf) errors.push(...inspectSchema(branch, root, activeSchemas, refStack));
  if (isRecord(schema.if)) errors.push(...inspectSchema(schema.if, root, activeSchemas, refStack));
  if (isRecord(schema.then)) errors.push(...inspectSchema(schema.then, root, activeSchemas, refStack));
  if (isRecord(schema.not)) errors.push(...inspectSchema(schema.not, root, activeSchemas, refStack));
  if (isRecord(schema.definitions) && Object.values(schema.definitions).every(isRecord)) {
    for (const child of Object.values(schema.definitions)) errors.push(...inspectSchema(child, root, activeSchemas, refStack));
  }
  activeSchemas.delete(schema);
  return errors;
}

function matchesType(value: unknown, type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  const matches: Record<string, (candidate: unknown) => boolean> = {
    object: isRecord,
    array: Array.isArray,
    string: (candidate) => typeof candidate === 'string',
    number: (candidate) => typeof candidate === 'number' && Number.isFinite(candidate),
    integer: (candidate) => typeof candidate === 'number' && Number.isInteger(candidate),
    boolean: (candidate) => typeof candidate === 'boolean',
    null: (candidate) => candidate === null,
  };
  return types.some((candidate) => matches[candidate as string]?.(value) === true);
}

function canonicalJson(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const items = value.map(canonicalJson);
    return items.some((item) => item === undefined) ? undefined : `[${items.join(',')}]`;
  }
  if (isRecord(value)) {
    const entries = Object.keys(value).sort().map((key) => {
      const item = canonicalJson(value[key]);
      return item === undefined ? undefined : `${JSON.stringify(key)}:${item}`;
    });
    return entries.some((item) => item === undefined) ? undefined : `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function validate(
  value: unknown,
  schema: Schema,
  path: string,
  root: Schema,
  refStack: Set<string>,
): string[] {
  const errors: string[] = [];
  if (hasOwn(schema, 'type') && !matchesType(value, schema.type)) {
    errors.push(`${path || '$'}: expected ${Array.isArray(schema.type) ? schema.type.join(' or ') : String(schema.type)}`);
    return errors;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => jsonEqual(candidate, value))) {
    errors.push(`${path || '$'}: must be one of enum values`);
  }
  if (hasOwn(schema, 'const') && !jsonEqual(schema.const, value)) errors.push(`${path || '$'}: must equal const value`);

  if (typeof value === 'string') {
    const codePoints = [...value].length;
    if (typeof schema.minLength === 'number' && codePoints < schema.minLength) errors.push(`${path || '$'}: must have at least ${schema.minLength} characters`);
    if (typeof schema.maxLength === 'number' && codePoints > schema.maxLength) errors.push(`${path || '$'}: must have at most ${schema.maxLength} characters`);
    if (typeof schema.pattern === 'string' && compilePattern(schema.pattern)?.test(value) === false) errors.push(`${path || '$'}: must match pattern`);
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${path || '$'}: must be >= ${schema.minimum}`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${path || '$'}: must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) errors.push(`${path || '$'}: must contain at least ${schema.minItems} items`);
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) errors.push(`${path || '$'}: must contain at most ${schema.maxItems} items`);
    if (isRecord(schema.items)) value.forEach((item, index) => errors.push(...validate(item, schema.items as Schema, `${path}[${index}]`, root, refStack)));
  }
  if (isRecord(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) if (!hasOwn(value, key as string)) errors.push(`${path ? `${path}.` : ''}${key as string}: required`);
    }
    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, childSchema] of Object.entries(properties)) {
      if (hasOwn(value, key)) errors.push(...validate(value[key], childSchema as Schema, path ? `${path}.${key}` : key, root, refStack));
    }
    for (const key of Object.keys(value)) {
      if (hasOwn(properties, key)) continue;
      if (schema.additionalProperties === false) errors.push(`${path ? `${path}.` : ''}${key}: additional property`);
      else if (isRecord(schema.additionalProperties)) {
        errors.push(...validate(value[key], schema.additionalProperties, path ? `${path}.${key}` : key, root, refStack));
      }
    }
  }
  if (typeof schema.$ref === 'string') {
    const reference = schema.$ref;
    if (refStack.has(reference)) errors.push(`cyclic schema reference: ${reference}`);
    else {
      const name = /^#\/definitions\/([^/]+)$/.exec(reference)?.[1];
      const definitions = root.definitions;
      if (name !== undefined && isRecord(definitions) && isRecord(definitions[name])) {
        refStack.add(reference);
        errors.push(...validate(value, definitions[name], path, root, refStack));
        refStack.delete(reference);
      }
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) errors.push(...validate(value, branch as Schema, path, root, refStack));
  }
  if (isRecord(schema.if)) {
    const conditionErrors = validate(value, schema.if, path, root, refStack);
    if (conditionErrors.length === 0 && isRecord(schema.then)) errors.push(...validate(value, schema.then, path, root, refStack));
  }
  if (isRecord(schema.not) && validate(value, schema.not, path, root, refStack).length === 0) errors.push(`${path || '$'}: must not match the excluded schema`);
  return errors;
}

export function validateSchemaDefinition(schema: Schema): string[] {
  return [...new Set(inspectSchema(schema, schema, new Set<object>(), new Set<string>()))];
}

export function validateAgainstSchema(value: unknown, schema: Schema): string[] {
  // Schemas are trusted product-owned JSON files; this validator is not a sandbox for hostile schema input.
  const schemaErrors = validateSchemaDefinition(schema);
  if (schemaErrors.length > 0) return schemaErrors;
  return validate(value, schema, '', schema, new Set<string>());
}
