---
instruction_id: keep-the-verification-gap-findings-shaped-by-their-kind
title: Keep the verification-gap findings shaped by their kind
summary: "A gap names its shape, the consumer it hits and the evidence that was actually checked, so a reader can tell a gap from a hunch."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A verification gap is written out as a finding.
conditions_does_not_apply_when: The finding is not a gap and carries no shape.
artifact_contract_output_type: verification-gap-finding
artifact_contract_required_data:
  - the shape of the gap
  - the impacted consumer
  - the evidence that was checked
artifact_contract_verified_by: "every gap names its shape and its consumer, and the evidence names the file and line that was read"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the verification-gap findings shaped by their kind
Emit each gap with the canonical fields plus this lens's extras:
`gap_shape` — "regression-gap", "missing-adoption-gap", "broken-verification-gap", or "other"
`consumer` — the impacted consumer or site, named concretely with `file:line`
`evidence` — what you actually checked: what the relevant test asserts with `file:line`; or, if none, the symbol/import-reference searches run and their result
For `gap_shape: "other"` findings the four canonical fields suffice (description only); `consumer` and `evidence` are optional.
