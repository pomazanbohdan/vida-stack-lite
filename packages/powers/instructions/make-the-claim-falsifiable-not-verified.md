---
instruction_id: make-the-claim-falsifiable-not-verified
title: "Make the claim falsifiable, not verified"
summary: "A recorded command makes a claim checkable by a later reader; it does not make the claim true, and the difference is stated."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A claim about a set of components, a version or a count is recorded."
conditions_does_not_apply_when: The claim was checked against the source at the time.
artifact_contract_output_type: falsifiable-claim
artifact_contract_required_data:
  - the claim
  - the command that can re-check it
artifact_contract_verified_by: the recorded command can be re-run and the claim is presented as checkable rather than as established
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/design-a-ui-phase.md
status: active
revision: 1
---

# Make the claim falsifiable, not verified
**It makes the inventory's origin falsifiable, not verified.** Nothing re-runs the command or compares the count against the installed package. A line that was simply made up passes. What you gain is that a reader — or you, six months later — can re-run the recorded command and see for yourself; before the field existed there was nothing to re-run.
It is a record you can audit, not a proof.
