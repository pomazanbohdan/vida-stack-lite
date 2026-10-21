---
instruction_id: name-the-severity-and-the-action-of-each-conflict
title: Name the severity and the action of each conflict
summary: "Three severities with three actions: Critical blocks the write, Important asks the user first, Minor is only reported."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: Incoming content conflicts with what the project already states.
conditions_does_not_apply_when: Nothing conflicts.
artifact_contract_output_type: conflict-severity
artifact_contract_required_data:
  - the severity of the conflict
  - the action the severity requires
  - the decision
artifact_contract_verified_by: every conflict carries one of the three severities and the action of that severity was taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/doc-conflict-engine.md
status: active
revision: 1
---

# Name the severity and the action of each conflict
Unsafe to proceed. The workflow MUST exit without writing any destination files.
Ambiguous or partially overlapping. The workflow MUST surface the warning and obtain explicit user approval before writing.
Never auto-approve.
Informational only. No gate; no user prompt required. Included in the report for transparency.
no exceptions for "minor" blockers
Re-invent severity labels per workflow — the three-level taxonomy is fixed
