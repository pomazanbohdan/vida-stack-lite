---
instruction_id: surface-the-omitted-prohibition-as-an-explicit-acceptance-criterion
title: Surface the omitted prohibition as an explicit acceptance criterion
summary: A constraint the author assumed but never wrote is written down as a checkable criterion before any code exists.
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A requirement is being written or reviewed.
conditions_does_not_apply_when: The requirement already carries its prohibitions explicitly.
artifact_contract_output_type: prohibition-criterion
artifact_contract_required_data:
  - the prohibition
  - the acceptance criterion it becomes
artifact_contract_verified_by: the omitted prohibition is written as a checkable criterion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/prohibition-probe.md
status: active
revision: 1
---

# Surface the omitted prohibition as an explicit acceptance criterion
The fix is not a better verifier; it is **spec completeness**: surface the omitted prohibition into an explicit, checkable acceptance criterion *before* any code exists, after which the verifier reliably enforces it
A goal-backward verifier only checks assertions that exist; an assertion only exists for a requirement that was written down
The class of constraint this probe targets — the *"must-NOT"* the author assumed but never wrote — is invisible to the verifier in exactly the same way an omitted edge is, but with a sharper failure mode
