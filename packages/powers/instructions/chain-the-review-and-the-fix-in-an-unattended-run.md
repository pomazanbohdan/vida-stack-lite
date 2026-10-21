---
instruction_id: chain-the-review-and-the-fix-in-an-unattended-run
title: Chain the review and the fix in an unattended run
summary: "An unattended run chains the review and the fix by itself, and a failure in either is reported and does not stop the chain."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A run works unattended over a body of work and no person asks for a review.
conditions_does_not_apply_when: The run is attended and the person decides what is reviewed.
artifact_contract_output_type: review-fix-chain
artifact_contract_required_data:
  - the review that ran
  - the fix that followed
  - the failures that were reported
artifact_contract_verified_by: the review and the fix ran unattended and a failure of either was reported without stopping the chain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
---

# Chain the review and the fix in an unattended run
Autonomous mode chains both review and fix
Auto-invoke the consolidated fix entry point
If either Skill fails, catch the error, display as non-blocking, and proceed
