---
instruction_id: treat-the-change-account-of-itself-as-testimony
title: Treat the change account of itself as testimony
summary: "The document the change was built from is the change's own account of itself: testimony, not evidence, however often it is repeated."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: The account of the change is read while the change is checked.
conditions_does_not_apply_when: No account of the change is available.
artifact_contract_output_type: claim-source
artifact_contract_required_data:
  - the account
  - the sections that hold the claims
artifact_contract_verified_by: the account was read as testimony and its claims were checked against the code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/references/claims-check.md
status: active
revision: 1
---

# Treat the change account of itself as testimony
It is the plan the change was built from. Read only its `## Intent` and `## Tasks & Acceptance` sections — the claims live there; ignore the rest of the file.
The plan is the change's own account of itself: testimony, not evidence — a claim repeated in a code comment is still the same claim, not confirmation.
