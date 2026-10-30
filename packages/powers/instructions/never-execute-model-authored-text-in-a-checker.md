---
instruction_id: never-execute-model-authored-text-in-a-checker
title: Never execute model-authored text in a checker
summary: A checker that runs the command it checks turns a plan file into arbitrary code execution.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A checker is about to decide whether a written command works.
conditions_does_not_apply_when: The command comes from a committed script and may be executed.
artifact_contract_output_type: checker-refusal
artifact_contract_required_data:
  - the written command
  - the reason it is not executed
artifact_contract_verified_by: the checker reports on the command without running it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never execute model-authored text in a checker
**It will not run your command.** PLAN.md is model-authored text; executing it from the checker would be arbitrary code execution, and would trigger the real lint/build as a side effect.
