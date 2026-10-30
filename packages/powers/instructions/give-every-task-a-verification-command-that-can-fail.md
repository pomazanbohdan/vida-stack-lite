---
instruction_id: give-every-task-a-verification-command-that-can-fail
title: Give every task a verification command that can fail
summary: "Each task carries an automated command, and when no test exists the task says so and creates the scaffold."
capability_tags:
  - write-tests-first
pattern_tags:
  - verification-harness
conditions_applies_when: A task in a plan is written.
conditions_does_not_apply_when: The task is a checkpoint that waits for a person.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the verification command
  - the failing direction
artifact_contract_verified_by: every task names an automated command that can fail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give every task a verification command that can fail
Nyquist Rule: Every `<verify>` includes `<automated>`. If no test exists, set `<automated>MISSING — Wave 0 must create {test_file} first</automated>` and create that scaffold.
Good: Specific automated command that runs in < 60 seconds
Bad: "It works", "Looks good", manual-only verification
