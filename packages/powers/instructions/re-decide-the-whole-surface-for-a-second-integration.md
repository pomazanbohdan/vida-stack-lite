---
instruction_id: re-decide-the-whole-surface-for-a-second-integration
title: Re-decide the whole surface for a second integration
summary: "When the same need is served by a second integration, every capability is decided again from the same full-coverage baseline; no exclusion is inherited silently."
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: A second integration of the same need is about to be planned.
conditions_does_not_apply_when: There is only one integration of the need.
artifact_contract_output_type: coverage-matrix
artifact_contract_required_data:
  - the need being served twice
  - the baseline each decision starts from
  - the re-decided capabilities
artifact_contract_verified_by: "the second integration's decisions were made fresh, not copied"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/ai-integration/fragments/api-coverage-plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Re-decide the whole surface for a second integration
- A second integration against the same need (e.g. a second platform for the same capability) starts from the **same full-coverage baseline** as the first.
- Do not carry over the first integration's opt-outs silently — re-decide each capability for the new surface, so a first-class/fallback asymmetry cannot accumulate.
