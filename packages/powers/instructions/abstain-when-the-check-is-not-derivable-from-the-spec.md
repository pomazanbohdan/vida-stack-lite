---
instruction_id: abstain-when-the-check-is-not-derivable-from-the-spec
title: Abstain when the check is not derivable from the spec
summary: "A check whose answer cannot be derived from the written spec is abstained on, never passed on confidence."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check has been tagged as not derivable from the written spec.
conditions_does_not_apply_when: The check is inferable from the stated spec and is graded normally.
artifact_contract_output_type: abstention-disposition
artifact_contract_required_data:
  - the abstained item
  - the evidence that was looked for
  - the abstention reason
artifact_contract_verified_by: the item is not marked passed and carries the abstention reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/honest-verifier.md
status: active
revision: 1
---

# Abstain when the check is not derivable from the spec
A verifier is trustworthy on inferable checks — defects determined by the stated spec. On a non-inferable check the correct answer is not derivable from the spec alone
Explicit evidence = a wired held-out/property-based test that passes, or a behavior the verifier directly observed. Symbol presence + wiring is not explicit evidence for a non-inferable truth
Never silent, never a hard halt. Interactive: the abstained item routes to the end-of-phase human checkpoint. Autonomous (AFK): it produces a prominent `unverified — held-out test recommended` flag and the completion line reads "complete with N unverified non-inferable checks"; the run neither silently passes the blind spot nor hard-halts
Distinguishable reason. The abstain disposition carries `reason: insufficient_spec` so the `human_needed` outcome is never conflated with an ordinary manual-UAT `human_needed`
