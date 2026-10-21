---
instruction_id: read-the-state-from-the-record-that-owns-it
title: Read the state from the record that owns it
summary: The state of the work comes from the record that holds it — the verification status read through its owner and never through a second parser — and never from another file that happens to mention the work.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: You need to know where the work stands.
conditions_does_not_apply_when: The state was already read from its own record.
artifact_contract_output_type: state-source
artifact_contract_required_data:
  - the record that was read
  - the state it carried
artifact_contract_verified_by: the state was taken from the record that owns it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/transition.md
status: active
revision: 3
---

# Read the state from the record that owns it
Do not infer workflow state from non-plan files.
Read the status, the blocking condition, and the follow-up review recommendation rather than inferring success from chat output alone.
The workflow always tries to leave behind a durable artifact describing what happened.
Monitor the plan file or fallback result file for terminal state
An older leaf file can still carry `status`.
It is read only when there is no plan.
This is the single source of truth for every subsequent step — the orchestrator MUST read this file at each step instead of relying on memory.
Every subsequent step
MUST begin by reading
and update the `status` field for items it processes.
This prevents the orchestrator from "forgetting" any work item across the multi-step workflow.
The manifest is the source of truth for what was processed.
the verification status is read through its ONE owner — never with awk/sed/grep over the report (that bypassed the closed enum, the staleness check and the phase-pinned report resolution, #3492).
A non-zero exit is the owner's hard error (a status outside passed | gaps_found | human_needed).
If VERIFY_STATUS is not `passed`:
Stop before confirming:
Detect post-completion mode when the caller states that phase completion and verification have already run.
SKIP `verify_completion` and `update_roadmap_and_state` (re-running `phase.complete` would double-write STATE.md/ROADMAP.md).
When in doubt, run standalone (mode 1) — it is idempotent enough to be safe, just slower.
