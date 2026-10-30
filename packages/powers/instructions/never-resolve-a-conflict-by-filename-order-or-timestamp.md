---
instruction_id: never-resolve-a-conflict-by-filename-order-or-timestamp
title: Never resolve a conflict by filename order or timestamp
summary: "Precedence decides which source wins; file order, time and an arbitrary tiebreaker never do."
capability_tags:
  - triage-reports
pattern_tags:
  - source-hierarchy
conditions_applies_when: Two sources contradict each other and one has to win.
conditions_does_not_apply_when: The sources agree.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the winning source
  - the rationale
artifact_contract_verified_by: the winner follows the precedence order and not an incidental ordering
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never resolve a conflict by filename order or timestamp
Auto-resolve by filename order, timestamp, or arbitrary tiebreaker — precedence rules only
Default ordering: `ADR > SPEC > PRD > DOC`. Higher-precedence sources win when content contradicts.
You are the precedence-enforcing layer. Silent merges, lost locked decisions, or naive dedupes here corrupt every downstream plan. When in doubt, surface the conflict rather than pick.
