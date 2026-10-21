---
instruction_id: tell-the-three-ways-a-gate-can-find-nothing
title: Tell the three ways a gate can find nothing
summary: "A gate that found nothing, a gate that looked at an empty scope and a gate that could not look are three outcomes; only the first is clean."
capability_tags:
  - harden-validation
pattern_tags:
  - empty-result-policy
conditions_applies_when: A gate reports that it found nothing to flag.
conditions_does_not_apply_when: The gate reported findings.
artifact_contract_output_type: gate-outcome
artifact_contract_required_data:
  - which of the three outcomes occurred
  - the reason for the second and third
artifact_contract_verified_by: the outcome distinguishes found-nothing from empty-scope from could-not-look
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/handle-gate-verb-exit-statuses.md
status: active
revision: 1
---

# Tell the three ways a gate can find nothing
A gate can end three ways when it has nothing to flag. Only the first is clean:
- **Looked and found nothing.** Exit `0`, a passing payload (`"passed": true`, `"all_passed": true`).
- **Looked at an empty scope.** Exit `66` (status mode), or exit `0` in payload mode with the gate's own skip message.
- **Could not look.** Exit `69`.
