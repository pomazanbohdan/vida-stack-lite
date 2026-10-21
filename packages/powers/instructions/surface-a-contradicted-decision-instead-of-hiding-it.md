---
instruction_id: surface-a-contradicted-decision-instead-of-hiding-it
title: Surface a contradicted decision instead of hiding it
summary: "When the work contradicts a recorded decision, the contradiction is stated in the output with the reason it may be worth reopening; it is not quietly dropped."
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: The work contradicts a decision that is recorded in the repository.
conditions_does_not_apply_when: No recorded decision covers the area being changed.
artifact_contract_output_type: contradiction-note
artifact_contract_required_data:
  - the decision that is contradicted
  - the reason it may be worth reopening
  - what the output does instead
artifact_contract_verified_by: the contradiction is stated in the output and not hidden
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/agents/domain.md
status: active
revision: 1
---

# Surface a contradicted decision instead of hiding it
- read ADRs relevant to the area you're working in before proposing structural changes. If your output contradicts an ADR, surface it explicitly:
- *Contradicts ADR-0002 – but worth reopening because…*
