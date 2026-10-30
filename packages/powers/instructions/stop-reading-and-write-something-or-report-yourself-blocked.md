---
instruction_id: stop-reading-and-write-something-or-report-yourself-blocked
title: "Stop reading and write something, or report yourself blocked"
summary: "After several read-only steps in a row the run stops: it writes the code it can write or names the information it is missing."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: Several read-only steps in a row produced no change.
conditions_does_not_apply_when: The reads are part of one bounded investigation.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the reason for the pause
  - the missing information
artifact_contract_verified_by: the run either wrote something or reported the missing information
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop reading and write something, or report yourself blocked
During task execution, if you make 5+ consecutive Read/Grep/Glob calls without any Edit/Write/Bash action:
STOP. State in one sentence why you haven't written anything yet. Then either:
Write code (you have enough context), or
Report "blocked" with the specific missing information.
Do NOT continue reading. Analysis without action is a stuck signal.
