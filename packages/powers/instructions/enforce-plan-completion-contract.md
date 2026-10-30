---
instruction_id: enforce-plan-completion-contract
title: Complete a task only when the contract is met
summary: "Before a task's ledger line, every named test must have run, its output must be read, and every expected result must have been compared."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: You are about to record a plan task as complete.
conditions_does_not_apply_when: "The task is still running, or it has no defined completion evidence."
artifact_contract_output_type: task-completion-evidence
artifact_contract_required_data:
  - full task test run
  - output
  - expected comparison
artifact_contract_verified_by: the full task test run passes and its output was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Complete a task only when the contract is met
Before a task's ledger line, all of the following are true, with evidence in this session — not inferred from the diff looking right.
Every test the brief names exists and ran in this task, and you read the output.
The final test run for the task passed.
Every `Expected:` line in the brief was compared against real output.
Every deviation from the brief has a `Ruling:` line in the ledger.
If any item is missing, the task is not complete: finish it.
A failing run records nothing; the task is not complete.
Run the test command the brief names for the whole task.
It runs the tests, keeps the full output in the workspace, prints the tail, and — only if they pass — appends the completion line to the ledger.
Verification before completion governs the claim.
Never move to the next task while the review has open Critical/Important issues that are neither fixed nor parked-with-ruling at the cap.
Watching it fail is a step, not a formality.
A test that passes before the implementation exists is a finding about the test.
Mark the todo complete and take the next task only after the completion line is recorded.
