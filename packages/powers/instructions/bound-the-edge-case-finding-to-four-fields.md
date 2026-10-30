---
instruction_id: bound-the-edge-case-finding-to-four-fields
title: Bound the edge-case finding to four fields
summary: "An edge-case finding carries exactly four fields, and each field has a stated bound: one line for the trigger, a single-line code sketch for the guard, fifteen words for the consequence."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - exhaustive-path-enumeration
conditions_applies_when: An unhandled path was found and the finding is written out.
conditions_does_not_apply_when: The lens declares its own findings shape and rendering.
artifact_contract_output_type: edge-case-finding
artifact_contract_required_data:
  - the location
  - the trigger condition
  - the guard sketch
  - the potential consequence
artifact_contract_verified_by: the finding has exactly the four fields and each stays inside its stated bound
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-edge-case-hunter.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the edge-case finding to four fields
Each edge-case finding contains exactly these four fields:
```json
[{
  "location": "file:start-end (or file:line when single line, or file:hunk when exact line unavailable)",
  "trigger_condition": "one-line description (max 15 words)",
  "guard_snippet": "minimal code sketch that closes the gap (single-line escaped string, no raw newlines or unescaped quotes)",
  "potential_consequence": "what could actually go wrong (max 15 words)"
}]
```
