---
instruction_id: abstain-and-flag-instead-of-guessing
title: Abstain and flag instead of guessing
summary: A case that cannot be decided from the evidence is recorded as unverified and handed to a human; it is never passed and never turned into a halt of the whole run.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A check reaches a case that cannot be settled from the evidence.
conditions_does_not_apply_when: The check can settle every case it reaches.
artifact_contract_output_type: abstention
artifact_contract_required_data:
  - the irreducible case
  - the flag that is emitted
  - where the case is routed
artifact_contract_verified_by: the case is flagged for a human and neither passed nor turned into a halt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/design/verifier-reach.md
status: active
revision: 1
---

# Abstain and flag instead of guessing
- The only honest move on an irreducible case is **abstain-and-flag**, not a higher bar.
- Never a silent pass; never a hard halt of an AFK run.
- record a non-authoritative LLM-judge verdict and emit an "unverified — human review recommended" flag.
