---
instruction_id: never-auto-dismiss-a-constraint
title: Never auto-dismiss a constraint
summary: "An automated run may resolve a constraint but never dismisses it: a dismissal needs a human reason."
capability_tags:
  - triage-reports
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A run resolves constraints without a human in the loop.
conditions_does_not_apply_when: A human decides each dismissal and records the reason.
artifact_contract_output_type: constraint-resolution-tally
artifact_contract_required_data:
  - the count resolved
  - the count left unresolved
  - the count dismissed
artifact_contract_verified_by: no constraint was dismissed without a human reason and the tally is logged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Never auto-dismiss a constraint
In `--auto`, Claude marks a prohibition `resolved` where it can write a defensible negative acceptance criterion (at the `test` or `judgment` tier), and leaves it `unresolved` otherwise.
It **never auto-dismisses** — dismissing a prohibition requires a human reason, because a wrong auto-dismissal is precisely the silent failure being eliminated.
Review the logged choices afterwards; auto mode is a fast first pass, not a substitute for judgement on a prohibition that carries risk.
