---
instruction_id: turning-the-gate-off-does-not-answer-the-question
title: Turning the gate off does not answer the question
summary: Switching a gate off silences the hold; the question the gate asked stays unanswered.
capability_tags:
  - verify-work-results
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A gate holds a phase and the gate is about to be switched off.
conditions_does_not_apply_when: The scope is resolved so the gate clears on its own.
artifact_contract_output_type: gate-disposition
artifact_contract_required_data:
  - the gate
  - the scope that is still undecided
artifact_contract_verified_by: the scope is resolved or the reasoned declaration is written instead of the gate being switched off
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-a-skipped-capability-probe.md
status: active
revision: 1
---

# Turning the gate off does not answer the question
**Turning the gate off does not answer the question.**
Prefer resolving the scope or writing the declaration.
