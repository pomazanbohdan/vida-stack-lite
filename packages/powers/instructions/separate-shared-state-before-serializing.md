---
instruction_id: separate-shared-state-before-serializing
title: Separate shared state before serializing it
summary: "When concurrent actors might share mutable state, eliminate the sharing first; serialize structurally only when one shared writer is a real invariant."
capability_tags:
  - harden-validation
pattern_tags:
  - state-modeling
conditions_applies_when: "Concurrent actors might write to the same file, branch, key, or state object."
conditions_does_not_apply_when: The actors are actually ordered and access cannot overlap.
artifact_contract_output_type: state-boundary
artifact_contract_required_data:
  - shared state
  - sharing eliminated
  - serialization mechanism
  - concurrency test
artifact_contract_verified_by: a concurrency test with two simultaneous updates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-separate-before-serializing-shared-state/SKILL.md
status: active
revision: 1
---

# Separate shared state before serializing it
When concurrent actors might share mutable state, first ask whether they need the same mutable object.
If not, eliminate the sharing.
When sharing is real, enforce serialization structurally:
lockfiles, sequential phases, exclusive ownership.
Instructions and conventions are not concurrency control.
Concurrent writes to shared state create race conditions that are intermittent, hard to reproduce, and expensive to debug.
Identify shared mutable state: files both read and write, branches both push to, APIs both define and consume.
Default to eliminating the shared write target.
Ask whether these actors need one canonical object, or are they publishing independent facts.
Give each actor its own owned file, key, branch, or state directory, and merge only at the read or reporting boundary.
Two workers writing their own last-field into one state file is still shared mutation.
Only when one shared write target is a real invariant, serialize access structurally:
lockfiles, sequential phases, a single-writer actor, or atomic compare-and-swap.
Treat "we need a lock" as a design smell to check, not as the default answer.
