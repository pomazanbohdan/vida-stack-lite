---
instruction_id: do-not-read-an-absent-threat-register-as-a-clean-one
title: Do not read an absent threat register as a clean one
summary: "A phase that was planned without a threat register is not a phase without threats: the register is built from the implementation first, and only then are the mitigations verified."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A security verification runs on work that carries no threat register.
conditions_does_not_apply_when: The register was written at planning time.
artifact_contract_output_type: retroactive-threat-register
artifact_contract_required_data:
  - the register built from the implementation
  - the mitigations that were verified
artifact_contract_verified_by: the register was built before any clean verdict was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/secure-phase.md
status: active
revision: 1
---

# Do not read an absent threat register as a clean one
Empty-by-no-planning must not rubber-stamp a clean
the auditor builds a register from implementation files first, then verifies mitigations
build a STRIDE register from implementation files first, then verify mitigations
the auditor must construct the register from scratch before verifying
