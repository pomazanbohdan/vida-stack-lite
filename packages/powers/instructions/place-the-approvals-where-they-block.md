---
instruction_id: place-the-approvals-where-they-block
title: Place the approvals where they block
summary: "Put the human decision at the moments that already exist, each blocking one specific piece of work and producing a written result to attach."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: Several people must agree on the product and someone has to sign off before the work starts.
conditions_does_not_apply_when: One person decides and no sign-off is required.
artifact_contract_output_type: approval-moments
artifact_contract_required_data:
  - the moments
  - what each blocks
  - the written result
artifact_contract_verified_by: every moment names what it blocks and produces a written result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
  - operations
---

# Place the approvals where they block
The skills give you five moments where a human decision is expected, and each one blocks something specific.
Put approvals there rather than inventing new gates.
Every one of these produces a written result, so the approval has something to attach to.
In regulated or enterprise settings those documents are the audit trail.
