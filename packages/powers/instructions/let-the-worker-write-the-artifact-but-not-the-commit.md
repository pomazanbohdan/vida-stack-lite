---
instruction_id: let-the-worker-write-the-artifact-but-not-the-commit
title: Let the worker write the artifact but not the commit
summary: "The delegated worker writes the findings into the report file and leaves the commit to the orchestrator, so there is one writer of the history."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A worker is delegated the job of producing a report.
conditions_does_not_apply_when: The worker is only asked to answer.
artifact_contract_output_type: delegation-contract
artifact_contract_required_data:
  - what the worker writes
  - what the orchestrator commits
artifact_contract_verified_by: the worker wrote the report and the orchestrator made the commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Let the worker write the artifact but not the commit
Write findings to the report path.
Do NOT commit the output - the orchestrator handles that.
