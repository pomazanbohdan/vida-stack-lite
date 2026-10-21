---
instruction_id: pick-the-gate-that-fits-what-the-check-can-do
title: Pick the gate that fits what the check can do
summary: "Four gate kinds: pre-flight before the work, revision after it, escalation when automation cannot resolve, abort when continuing is dangerous."
capability_tags:
  - execute-plan
pattern_tags:
  - completion-criteria
conditions_applies_when: A validation point is placed in a run.
conditions_does_not_apply_when: The run has no validation point to place.
artifact_contract_output_type: gate-choice
artifact_contract_required_data:
  - the gate kind
  - what it does when it fires
  - how it recovers
artifact_contract_verified_by: the gate kind follows from where the check sits and what it can do
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/gates.md
status: active
revision: 1
---

# Pick the gate that fits what the check can do
Pre-flight gates belong at workflow entry points. They are cheap, deterministic checks that prevent wasted work.
Revision gates belong after a producer step where quality varies. Always pair them with an iteration cap to prevent infinite loops.
Escalation gates belong wherever automated resolution is impossible or ambiguous. They are the safety valve between revision loops and abort.
Abort gates belong at points where continuing would cause damage, waste significant resources, or produce meaningless output. They should preserve state so work can resume after the root cause is fixed.
Selection heuristic: Start with pre-flight. If the check happens after work is produced, it is a revision gate. If the revision loop cannot resolve the issue, escalate. If continuing is dangerous, abort.
