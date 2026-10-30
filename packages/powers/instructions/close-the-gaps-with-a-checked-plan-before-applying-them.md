---
instruction_id: close-the-gaps-with-a-checked-plan-before-applying-them
title: Close the gaps with a checked plan before applying them
summary: "The repair of a failed check is planned and checked before it is executed, and the plan is iterated until it passes."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - verification-before-completion
conditions_applies_when: Failures were found and the repair is about to be planned.
conditions_does_not_apply_when: The failures are already fixed.
artifact_contract_output_type: gap-closure-plan
artifact_contract_required_data:
  - the plan that closes the gaps
  - the verdict of the check on it
artifact_contract_verified_by: the repair plan passed the check before it was offered for execution
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-and-ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a root-cause action, then ends after a colon introducing the next step without stating it; the incomplete sequence cannot support a reliable form or domain."
---

# Close the gaps with a checked plan before applying them
**Diagnoses root causes** — spawns parallel debug agents, one per issue, and updates `UAT.md` with root causes.
**Presents next step** — when plans pass the checker:
