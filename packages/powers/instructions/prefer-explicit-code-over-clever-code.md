---
instruction_id: prefer-explicit-code-over-clever-code
title: Prefer explicit code over clever code
summary: Explicit code beats compact code whenever the compact version needs a mental pause to parse.
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "A compact expression could replace a longer, explicit form."
conditions_does_not_apply_when: The compact form stays obvious to every reader of that codebase.
artifact_contract_output_type: clarity-decision
artifact_contract_required_data:
  - the compact form considered
  - the explicit form chosen
  - the parsing cost avoided
artifact_contract_verified_by: the chosen form reads without a mental pause
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Prefer explicit code over clever code

Explicit code is better than compact code when the compact version requires a mental pause to parse.

```typescript
// UNCLEAR: Dense ternary chain
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// CLEAR: Readable mapping
function getStatusLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

"Fewer lines is always simpler" | A 1-line nested ternary is not simpler than a 5-line if/else. Simplicity is about comprehension speed, not line count.
