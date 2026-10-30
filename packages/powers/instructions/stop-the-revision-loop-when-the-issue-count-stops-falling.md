---
instruction_id: stop-the-revision-loop-when-the-issue-count-stops-falling
title: Stop the revision loop when the issue count stops falling
summary: "The revision loop counts the issues the checker returns and stops early when the count does not fall between two rounds, because a stuck producer does not become unstuck with more rounds."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
  - verification-rerun-policy
conditions_applies_when: A checker sends the work back for revision.
conditions_does_not_apply_when: No issue was returned.
artifact_contract_output_type: revision-loop-record
artifact_contract_required_data:
  - the issue count per round
  - the round that stopped the loop
  - the state presented to the user
artifact_contract_verified_by: the loop stopped when the count stopped falling and the final state was presented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/revision-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop the revision loop when the issue count stops falling
Track the number of blocking and warning issues returned by the checker on each iteration. If the count does not decrease between consecutive iterations, the producing agent is stuck and further iterations will not help. Break early and escalate to the user.
**INFO-level issues are always acceptable** -- they don't trigger revision
**Don't silently swallow issues** -- always present the final state to the user after exiting the loop
If issues persist after 3 revision cycles:
1. Present remaining issues to the user
2. Use a gate prompt
question: "Issues remain after 3 revision attempts. Proceed with current output?" header: "Proceed?" options: - label: "Proceed anyway"   description: "Accept output with remaining issues" - label: "Adjust approach"  description: "Discuss a different approach"
3. If "Proceed anyway": accept current output and continue
4. If "Adjust approach" or "Other": discuss with user, then re-enter the producing step with updated context
Track the number of Critical + Important issues returned by the checker on each iteration. If the count does not decrease between consecutive iterations, the producing agent is stuck and further iterations will not help. Break early and escalate to the user
**Each iteration gets a fresh agent spawn** -- don't try to continue in the same context
**Checker feedback must be inlined** -- the revision agent needs to see exactly what failed
