---
instruction_id: start-a-fresh-agent-for-each-revision-round
title: Start a fresh agent for each revision round
summary: "Every revision round runs in a fresh agent with the checker's issues inlined verbatim, because continuing in the same context keeps the blind spots that produced the issues."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
  - revision-round-continuity-policy
conditions_applies_when: A checker sent the work back and the producer is re-dispatched.
conditions_does_not_apply_when: The work is not being revised.
artifact_contract_output_type: revision-dispatch
artifact_contract_required_data:
  - the issues passed to the new agent
  - the context the new agent started with
artifact_contract_verified_by: "the new agent received the checker's issues verbatim and did not continue the previous context"
compatibility_excludes:
  - run-bounded-fix-loop
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/revision-loop.md
status: active
revision: 2
---

# Start a fresh agent for each revision round
**Each iteration gets a fresh agent spawn** -- don't try to continue in the same context
**Checker feedback must be inlined** -- the revision agent needs to see exactly what failed
When re-spawning the producing agent for revision, pass the checker's YAML-formatted issues. The checker's output contains a
heading followed by a YAML block. Parse this block and pass it verbatim to the revision agent.
Display iteration progress before each revision spawn: `Revision iteration {N}/3 -- {blocker_count} blockers, {warning_count} warnings`
