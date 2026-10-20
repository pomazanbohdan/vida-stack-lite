---
instruction_id: schedule-a-refactoring-pass
title: Schedule a refactoring pass
summary: "After several stories, at the end of an epic and every so often otherwise, do a refactoring pass: agent-built code drifts without it, with duplication, near-copies of helpers and patterns that diverged between sessions."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Several stories have been delivered and the code has drifted.
conditions_does_not_apply_when: The last change is still in flight.
artifact_contract_output_type: refactoring-plan
artifact_contract_required_data:
  - the moment to refactor
  - the drift found
  - the work it produces
artifact_contract_verified_by: the refactoring is its own pass with the whole changeset in view
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 1
---

# Schedule a refactoring pass
After several stories, at the end of an epic, and every so often otherwise, do a refactoring pass toward cleaner code.
This step is commonly skipped, and agent-built code drifts without it: duplication, near-copies of helpers, and patterns that diverged between sessions.
The end of an epic is a good moment because the whole changeset can be looked at together.
and its findings are a ready list of refactoring work
