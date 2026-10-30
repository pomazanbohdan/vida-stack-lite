---
instruction_id: default-to-a-human-review-when-you-cannot-determine-coverage
title: Default to a human review when you cannot determine the coverage
summary: When the coverage cannot be determined the judgment flag is set to the human with a reason; it is never left empty and never set to skip the human.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The coverage of a deliverable cannot be determined.
conditions_does_not_apply_when: The coverage was determined and verified.
artifact_contract_output_type: coverage-fallback
artifact_contract_required_data:
  - the reason the coverage could not be determined
artifact_contract_verified_by: the judgment flag is set to the human and carries a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary-minimal.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary-standard.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary-complex.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Default to a human review when you cannot determine the coverage
if you cannot determine coverage for a deliverable, you MUST set `human_judgment: true` with `rationale: "Coverage not determined at authoring time — verifier must classify"`.
Never leave a deliverable's `human_judgment` empty, and never set it `false` just to skip the prompt — auto-pass additionally requires a passing `verification` entry, so the flag alone cannot skip the human.
When coverage is uncertain, default human_judgment: true — never auto-skip the human.
