---
instruction_id: classify-the-user-response-into-a-fixed-set
title: Classify the user response into a fixed set
summary: "An answer is read as a pass, a skip, a block, a deferral or an issue; a block is not a defect and never becomes one."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A person answered a checkpoint and the answer has to be turned into a record.
conditions_does_not_apply_when: The answer is already recorded as a verdict.
artifact_contract_output_type: checkpoint-result
artifact_contract_required_data:
  - the answer
  - the class it was read as
  - the reason
artifact_contract_verified_by: every answer was read as one of the fixed classes and a block stayed out of the defect list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Classify the user response into a fixed set
**If response indicates pass:**
Empty response, "yes", "y", "ok", "pass", "next", "approved", "✓"
**If response indicates skip:**
**If response indicates blocked:**
Note: Blocked tests do NOT go into the Gaps section (they aren't code issues — they're prerequisite gates).
**If response is anything else:**
Treat as issue description
