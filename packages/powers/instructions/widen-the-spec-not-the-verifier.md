---
instruction_id: widen-the-spec-not-the-verifier
title: "Widen the spec, not the verifier"
summary: "A verifier can only check assertions that exist, so reliability is raised by writing the missing requirement down, not by tightening the check."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check misses a defect and the question is where to add the leverage.
conditions_does_not_apply_when: The defect is covered by a requirement that was written down.
artifact_contract_output_type: reach-decision
artifact_contract_required_data:
  - the assertion that is missing
  - the requirement it should come from
  - where the leverage is put
artifact_contract_verified_by: the missing requirement was written down rather than the check being sharpened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/design/verifier-reach.md
status: active
revision: 1
---

# Widen the spec, not the verifier
- **A goal-backward verifier can only check assertions that exist.**
- The conclusion is structural: reliability is **not** a verifier-tuning problem.
- The verifier is fine *when the predicate exists*; it fails when the predicate was never written.
- So the leverage is upstream — make the missing predicate exist.
