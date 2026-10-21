---
instruction_id: translate-the-technical-framing-into-the-outcome
title: Translate the technical framing into the outcome
summary: "The same decision is stated in the language of the person who has to make it, without losing detail."
capability_tags:
  - communicate-concisely
pattern_tags:
  - technical-writing
conditions_applies_when: The person who has to make the decision cannot be expected to reason in implementation terms.
conditions_does_not_apply_when: The audience is technical and the implementation terms are the ones they need.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the reframed label
  - the reframed description
  - the unchanged decision
artifact_contract_verified_by: the same decision is preserved and no detail is removed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/advisor.md
status: active
revision: 1
---

# Translate the technical framing into the outcome
When `NON_TECHNICAL_OWNER` is true, reframe gray area labels and descriptions in product-outcome language before presenting them. Preserve the same underlying decision — only change the framing
Replace implementation-level terms with outcome descriptions the user can reason about without technical context. The Recommendation column value and the table structure remain intact. Do not remove detail; translate it.
