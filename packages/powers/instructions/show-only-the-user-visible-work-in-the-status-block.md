---
instruction_id: show-only-the-user-visible-work-in-the-status-block
title: Show only the user-visible work in the status block
summary: The status block lists the capabilities the user recognises; the technical tasks still count but are not listed there.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concrete-trigger
conditions_applies_when: A per-phase status block is rendered.
conditions_does_not_apply_when: The block lists every task.
artifact_contract_output_type: status-block
artifact_contract_required_data:
  - the user-visible entries
  - the rule that selected them
artifact_contract_verified_by: only user-visible work is listed and the technical tasks still count toward the total
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress/steps/mvp-display.md
status: active
revision: 1
---

# Show only the user-visible work in the status block
Tasks whose names are technical-sounding ("Wire DB schema", "Create migration", "Bump deps") are NOT rendered as user-flow status lines.
Tasks that fail the heuristic still count toward the standard task progress total but don't appear in the user-flow sub-block.
