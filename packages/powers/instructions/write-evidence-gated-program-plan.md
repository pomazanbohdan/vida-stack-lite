---
instruction_id: write-evidence-gated-program-plan
title: Write an evidence-gated program plan
summary: "Deliver a plan that is a checklist an owner runs box by box and the operator audits from the evidence, with one section per PR."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "The work spans phases or stacked PRs, or a single change crosses several files without an obvious approach."
conditions_does_not_apply_when: "The change is one or two files with an obvious approach; skip the plan, say so, and stop."
artifact_contract_output_type: gated-plan
artifact_contract_required_data:
  - PR sections
  - dependencies and file boundaries
  - "unit, live, and perf boxes"
  - review gates
  - risks
artifact_contract_verified_by: each stage gate checked before the next stage starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/multi-phase-plan.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/05-build-and-clean.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Write an evidence-gated program plan
You own the plan, not the code.
The plan is a checklist an owner runs box by box and the operator audits from the evidence.
The plan is the deliverable, so do not implement.
When the change is one or two files with an obvious approach, skip the plan, say so, and stop.
Settle open questions by prototype before you write, keeping the branch, the SHA, and the screenshots as evidence.
Ask the operator only about a product or preference call that no run can settle, and give options.
Explore in subagents with an explicit model; each returns file pointers, conventions, test commands, and entry points.
No inlined dumps.
Copy the skeleton into the plan file and fill every placeholder, keeping every heading and sub-block in the order shown.
One section per PR, and one PR is one change with its own evidence.
Name the execution playbook in How to read this.
The body is one how-to mode, and appendices hold explanation and reference.
Each heading states the task or the finding.
No long dashes, and no mid-sentence colons.
Run the plan check script and fix every line it prints.
Tests alone are not sufficient verification.
A PR is verified only when its unit, live, and perf boxes are all checked.
The live block is mandatory, and the perf gate is dual-sided: trunk and head must both produce the named metric.
Do not claim a ratio between unlike scenarios.
A PR that changes an interaction is review-gated, so the operator reviews it in chat with screenshots and a video before merge.
Check a box only when its evidence exists: a file, a log line, a screenshot, a test run, or a SHA.
Hand back the plan path and the script's output, then stop.
Execution starts on the operator's explicit go, under the execution playbook the plan names.
