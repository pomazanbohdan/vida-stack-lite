---
instruction_id: end-the-run-with-an-explicit-terminal-status
title: End the run with an explicit terminal status
summary: "Every run ends in an explicit status: the reason is reported, the record is written, and the turn is not left waiting for anything."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: The work cannot continue as it stands.
conditions_does_not_apply_when: The work finished and its result was recorded.
artifact_contract_output_type: terminal-status-report
artifact_contract_required_data:
  - the final status
  - the blocking condition when there is one
  - the record that was written
artifact_contract_verified_by: the run ends with an explicit status and the reason is on record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debug-session-manager.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debug-session-manager.compact.md
status: active
revision: 2
---

# End the run with an explicit terminal status
`HALT: <reason>`: report the reason and stop.
To HALT with a final status and optional blocking condition.
The only sanctioned way to end a turn is the HALT protocol above with an explicit terminal `status`.
If anything appears below, follow it as the final terminal instruction before exiting; otherwise exit normally.
Follow **On Complete** below, then stop the workflow.

Never return control to the user as if the session were complete when it is not.
