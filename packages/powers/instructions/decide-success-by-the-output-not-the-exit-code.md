---
instruction_id: decide-success-by-the-output-not-the-exit-code
title: "Decide success by the output, not the exit code"
summary: "A tool that reports issues may still have run successfully: the run is judged by whether its output is usable, not by the code it returned."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A command has finished and its exit code has to be read.
conditions_does_not_apply_when: The exit code is the only signal the tool gives.
artifact_contract_output_type: run-verdict
artifact_contract_required_data:
  - the exit code
  - the state of the output
  - the verdict
artifact_contract_verified_by: the verdict follows the state of the output and not the exit code alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review/steps/structural-pre-pass.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Decide success by the output, not the exit code
Exits 0 when clean and 1 when issues are found - BOTH are successful runs.
Only a timeout (124), usage error (2), or crash yields no usable JSON
Success is decided by whether the output parses
