---
instruction_id: resolve-every-low-confidence-item-or-document-why-it-is-acceptable
title: Resolve every low-confidence item or document why it is acceptable
summary: Every unresolved decision item and every low-confidence recommendation becomes a decision task or a written acceptance of the risk.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The plan is about to be finalized and the research carries open items.
conditions_does_not_apply_when: The research carries no open items.
artifact_contract_output_type: open-item-disposition
artifact_contract_required_data:
  - the open item
  - the decision task or the documented acceptance
artifact_contract_verified_by: no open item was silently accepted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Resolve every low-confidence item or document why it is acceptable
Before finalizing the plan, read ALL `[NEEDS DECISION]` items and LOW-confidence recommendations from SUMMARY.md. For each: either (a) create a `checkpoint:decision` task to resolve it, or (b) document why the risk is acceptable in the plan's deviation notes. LOW-confidence items that are silently accepted become undocumented technical debt
