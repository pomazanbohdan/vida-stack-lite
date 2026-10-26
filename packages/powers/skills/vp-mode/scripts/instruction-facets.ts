export const INSTRUCTION_FORMS = ['principle', 'decision-rule', 'procedure', 'checklist'] as const;
export const INSTRUCTION_DOMAINS = ['engineering', 'design-ux', 'product', 'business', 'research', 'operations'] as const;
export const FACETED_INSTRUCTION_SCHEMA_NAME = 'vpinstruction.v1.1.schema.json';

export type InstructionForm = typeof INSTRUCTION_FORMS[number];
export type InstructionDomain = typeof INSTRUCTION_DOMAINS[number];
export type ClassificationStatus = 'classified' | 'unclassified';
export type InstructionSchemaVersion = 'legacy-v1' | 'faceted-v1.1';

export const INSTRUCTION_FORM_DESCRIPTIONS: Record<InstructionForm, string> = {
  principle: 'Guides judgment.',
  'decision-rule': 'Expresses a conditional choice or obligation.',
  procedure: 'Requires an ordered action sequence.',
  checklist: 'Enumerates checks without a required order.',
};

export type InstructionClassification =
  | { classification_status: 'classified'; instruction_form: InstructionForm; domains: InstructionDomain[] }
  | { classification_status: 'unclassified'; classification_reason: string };

export const LEGACY_CLASSIFICATION: InstructionClassification = {
  classification_status: 'unclassified',
  classification_reason: 'legacy-v1-no-facet-fields',
};

const forms = new Set<string>(INSTRUCTION_FORMS);
const domains = new Set<string>(INSTRUCTION_DOMAINS);
const owns = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function instructionSchemaVersion(marker: unknown): InstructionSchemaVersion | undefined {
  if (marker === undefined) return 'legacy-v1';
  if (marker === 'VPInstruction/v1.1') return 'faceted-v1.1';
  return undefined;
}

export function isInstructionForm(value: unknown): value is InstructionForm {
  return typeof value === 'string' && forms.has(value);
}

export function isInstructionDomain(value: unknown): value is InstructionDomain {
  return typeof value === 'string' && domains.has(value);
}

export function isClassificationStatus(value: unknown): value is ClassificationStatus {
  return value === 'classified' || value === 'unclassified';
}

export function parseFacetClassification(fields: Record<string, unknown>): InstructionClassification | undefined {
  if (fields.classification_status === 'classified') {
    if (!isInstructionForm(fields.instruction_form) || !Array.isArray(fields.domains) || fields.domains.length === 0
      || owns(fields, 'classification_reason')) return undefined;
    const selectedDomains: InstructionDomain[] = [];
    for (const domain of fields.domains) {
      if (!isInstructionDomain(domain) || selectedDomains.includes(domain)) return undefined;
      selectedDomains.push(domain);
    }
    return { classification_status: 'classified', instruction_form: fields.instruction_form, domains: selectedDomains };
  }
  if (fields.classification_status === 'unclassified') {
    const reason = fields.classification_reason;
    if (typeof reason !== 'string' || reason.trim() === '' || owns(fields, 'instruction_form') || owns(fields, 'domains')) return undefined;
    return { classification_status: 'unclassified', classification_reason: reason };
  }
  return undefined;
}

export function isInstructionClassification(value: unknown): value is InstructionClassification {
  if (!isRecord(value)) return false;
  const parsed = parseFacetClassification(value);
  if (parsed === undefined) return false;
  const keys = Object.keys(value);
  const expected = parsed.classification_status === 'classified'
    ? ['classification_status', 'instruction_form', 'domains']
    : ['classification_status', 'classification_reason'];
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}
