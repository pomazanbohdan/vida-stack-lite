---
instruction_id: scan-plan-for-conflicts
title: Scan the plan for conflicts before Task 1
summary: "Write one row per shared interface and one per task, rule on what the scan surfaces, and start the first task only after that."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The plan has several tasks that share files or interfaces.
conditions_does_not_apply_when: The plan is a single task with no shared boundaries.
artifact_contract_output_type: plan-conflict-scan
artifact_contract_required_data:
  - tasks
  - shared files
  - interfaces
  - rulings
artifact_contract_verified_by: one row per shared interface and per task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scan the plan for conflicts before Task 1
Before dispatching Task 1, scan the plan once for conflicts, writing down what you checked as you check it.
Look for tasks that contradict each other or the plan's Global Constraints.
Look for anything the plan explicitly mandates that the review rubric treats as a defect.
The scan's output is a table, not a verdict.
One row for every pair of tasks that share a file or an interface: the two tasks, what one produces against what the other consumes, and what you found.
One row for every task: whether its own text agrees with itself — the tests it specifies against the code it specifies, the files it creates against the files it later touches.
"The scan is clean" without those rows is not a scan you ran.
Write the table to the ledger.
Rule on everything you find before execution begins — each finding against the plan text that mandates it — and record each ruling in the ledger.
If the scan is clean, proceed without comment.
The review loop remains the net for conflicts that only emerge from implementation.
A plan whose tasks share nothing gets the single line `Pre-flight: no shared interfaces`.
Do not start Task 1 before the scan.
Update the scan if the plan changes.
