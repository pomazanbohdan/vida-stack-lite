---
instruction_id: ask-before-you-write-an-empty-section
title: Ask before you write an empty section
summary: A detector that proposes nothing is far more likely to have missed something than to have found an edge-free subject; the author confirms before an empty section is written.
capability_tags:
  - harden-validation
pattern_tags:
  - empty-result-policy
conditions_applies_when: A detector returned no applicable rows and an empty section would be written.
conditions_does_not_apply_when: The detector is known to be complete.
artifact_contract_output_type: empty-section-decision
artifact_contract_required_data:
  - the empty report
  - the confirmation that it is really empty
  - the section that is written
artifact_contract_verified_by: the author confirmed the emptiness explicitly before the empty section was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Ask before you write an empty section
do NOT proceed silently: ask the author to confirm via AskUserQuestion
Only write an empty `## Edge Coverage` section after explicit confirmation.
