---
instruction_id: record-a-partial-capture-as-a-partial-one
title: Record a partial capture as a partial one
summary: The capture outcome names what was captured and what failed; a partial capture is never recorded as a capture.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A collection step can produce some of its results and fail on others.
conditions_does_not_apply_when: The step either produces everything or produces nothing.
artifact_contract_output_type: capture-outcome
artifact_contract_required_data:
  - the outcome
  - the failed captures by name
artifact_contract_verified_by: "the outcome reads partial or not captured when any capture failed, and the failures are named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-auditor.md
status: active
revision: 1
---

# Record a partial capture as a partial one
The block's last line is its outcome: `captured`, `PARTIAL` or `NOT captured`. Record `captured` only for the first; otherwise name the failed captures and score the visual pillars without them.
