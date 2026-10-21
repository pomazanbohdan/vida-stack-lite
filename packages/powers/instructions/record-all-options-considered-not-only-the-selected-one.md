---
instruction_id: record-all-options-considered-not-only-the-selected-one
title: "Record all options considered, not only the selected one"
summary: The audit trail keeps the options that were rejected and the answer the user gave.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A decision is taken in a discussion.
conditions_does_not_apply_when: No options were weighed.
artifact_contract_output_type: decision-audit-trail
artifact_contract_required_data:
  - each option considered
  - the one that was selected
  - the answer the user gave
artifact_contract_verified_by: the trail holds every option and the selected one is marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/discussion-log.md
status: active
revision: 1
---

# Record all options considered, not only the selected one
Includes ALL options considered, not just the selected one
Captures all options considered, not just the selected one. Separate from CONTEXT.md which is the implementation artifact consumed by downstream agents.
**User's choice:** [Selected option or verbatim free-text response]
