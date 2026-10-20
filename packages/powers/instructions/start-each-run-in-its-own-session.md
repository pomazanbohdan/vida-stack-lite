---
instruction_id: start-each-run-in-its-own-session
title: Start each run in its own session
summary: "Open a fresh session for every run, because a session reused from another workflow mixes the contexts and confuses the run."
capability_tags:
  - curate-context
pattern_tags:
  - worktree-isolation
conditions_applies_when: A run starts while a session from another workflow is still open.
conditions_does_not_apply_when: The same session is deliberately continuing the same run.
artifact_contract_output_type: session-isolation
artifact_contract_required_data:
  - the session opened
  - the run it serves
artifact_contract_verified_by: "the run starts in a session that carries no other workflow's context"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/build-a-change.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/review-a-change.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
status: active
revision: 1
---

# Start each run in its own session
Open a **fresh chat** in your AI IDE.
Reusing a session from another workflow can mix contexts and confuse the run.
Start a fresh chat and name the skill.
