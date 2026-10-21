---
instruction_id: write-the-session-state-before-you-act-not-after
title: "Write the session state before you act, not after"
summary: "The state file is updated before the next step so that a reset shows what was about to happen, and the next action is concrete."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: A long-running investigation keeps its state on disk.
conditions_does_not_apply_when: The work fits in one turn and needs no state file.
artifact_contract_output_type: session-state
artifact_contract_required_data:
  - the status
  - the focus
  - the next action
artifact_contract_verified_by: the state file was written before the action and the next action names a concrete step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 1
---

# Write the session state before you act, not after
Update the file BEFORE taking action, not after. If context resets mid-action, the file shows what was about to happen.
Current Focus | OVERWRITE | Before every action
Symptoms | IMMUTABLE | After gathering complete
Evidence | APPEND | After each finding
`next_action` must be concrete and actionable. Bad examples: "continue investigating", "look at the code". Good examples: "Add logging at line 47 of auth.js to observe token value before jwt.verify()", "Run test suite with NODE_ENV=production to check env-specific behavior", "Read full implementation of getUserById in db/users.cjs".
