---
instruction_id: wait-boundedly-for-workers
title: Wait for workers in bounded stretches
summary: "Keep doing local work while workers run, wait in bounded stretches, and reconcile live children between them instead of polling."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A worker runs asynchronously and its result is needed for the next step.
conditions_does_not_apply_when: "The result is already in hand, or the work is not delegated."
artifact_contract_output_type: bounded-wait
artifact_contract_required_data:
  - local work
  - wait stretches
  - worker state
artifact_contract_verified_by: no silent or unbounded wait
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 1
---

# Wait for workers in bounded stretches
Never poll a wait interface with short timeouts.
Never sit in one silent, open-ended wait either.
While you have local work, keep working: ledger updates, packaging the next review, reading reports.
Child results arrive on their own.
When you are genuinely idle, wait in bounded stretches (five to ten minutes, where your platform allows).
Between stretches post one line of status and reconcile your live children: list them.
Chase any that finished without reporting.
A bounded stretch keeps nearly all of a long wait's efficiency while guaranteeing a stuck or lost child is noticed within minutes, not at the end of the session.
Everything you paste into a dispatch prompt — and everything a subagent prints back — stays resident in your context for the rest of the session and is re-read on every later turn.
Hand artifacts over as files.
Record the implementer's agent identity from the dispatch result.
A real session's dispatch hit 42k chars of which 99% was pasted history.
A dispatch prompt describes one task, not the session's history.
Never dispatch multiple implementation subagents in parallel (conflicts).
