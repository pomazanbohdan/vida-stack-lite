---
instruction_id: an-unrunnable-probe-costs-a-checkpoint-not-a-block
title: "An unrunnable probe costs a checkpoint, not a block"
summary: A probe that cannot run leaves the claim unlocked and costs a confirmation checkpoint; confirming it at the checkpoint is not allowed.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A probe cannot be run in this environment.
conditions_does_not_apply_when: The probe can be run.
artifact_contract_output_type: unlocked-claim
artifact_contract_required_data:
  - the claim left unlocked
  - the checkpoint that carries the confirmation
artifact_contract_verified_by: the claim is left unlocked and the checkpoint asks for the confirmation instead of asserting it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# An unrunnable probe costs a checkpoint, not a block
The claim still reaches the planner and can still shape a plan — it simply cannot become a locked `CONTEXT.md` decision that downstream phases treat as settled.
**A probe you cannot run costs you a confirmation checkpoint, not a blocked plan.**
**What you should *not* do is confirm the claim at the checkpoint to make the prompt go away.** Confirming is you asserting the premise on your own authority; it will be treated as settled by every phase after this one, and the checkpoint is the last place anybody will look at it.
