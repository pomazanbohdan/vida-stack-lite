---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-secure-phase-md-9be32858-c01"
title: "gsd-core: gsd-core/workflows/secure-phase.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/secure-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/secure-phase.md\"}"
atom_ids:
  - do-not-read-an-absent-threat-register-as-a-clean-one
  - do-not-skip-the-deeper-check-because-the-shallow-one-found-nothing
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-read-an-absent-threat-register-as-a-clean-one\",\"file_sha256\":\"8765d958a262b379738a9f484e673b5da86c4d00b567a35ec7eb400b7b6bc1b2\",\"content_sha256\":\"69bbd2cce33a64fb2c2e9e022a18b8dd6d93e927b2abf8f0e59a47dfb09c6825\",\"file_bytes\":1541,\"body_bytes\":346},{\"atom_id\":\"do-not-skip-the-deeper-check-because-the-shallow-one-found-nothing\",\"file_sha256\":\"6cfe1d65f0bdec047b551b10ec21be4ebd511b9a3f45c29c77df66275180ccde\",\"content_sha256\":\"8678f300a95538ef82d1a0ecd3f235d79739d263b78bed53af5a4b5a8c93e37c\",\"file_bytes\":1446,\"body_bytes\":272}]"
carrier_sha256: 15f4edf5a98bd4b53f1be9eb1b576b48305c919f8a1d9323064ac4338f5c83f4
carrier_bytes: 3338
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-read-an-absent-threat-register-as-a-clean-one -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/secure-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Do not read an absent threat register as a clean one
Empty-by-no-planning must not rubber-stamp a clean
the auditor builds a register from implementation files first, then verifies mitigations
build a STRIDE register from implementation files first, then verify mitigations
the auditor must construct the register from scratch before verifying
<!-- vpmodule:atom:end do-not-read-an-absent-threat-register-as-a-clean-one -->
<!-- vpmodule:atom:begin do-not-skip-the-deeper-check-because-the-shallow-one-found-nothing -->
---
instruction_id: do-not-skip-the-deeper-check-because-the-shallow-one-found-nothing
title: Do not skip the deeper check because the shallow one found nothing
summary: "A preliminary classification is a shallow pass; when a deeper level is in force it still runs, because a clean shallow pass does not replace the deeper verification."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A shallow pass found nothing and a deeper verification level is in force.
conditions_does_not_apply_when: The shallow pass is the level in force.
artifact_contract_output_type: verification-depth
artifact_contract_required_data:
  - the level in force
  - the deeper checks that ran
artifact_contract_verified_by: the deeper verification ran even though the shallow pass was clean
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/secure-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not skip the deeper check because the shallow one found nothing
The preliminary threat classification is grep-level (L1 depth) and is insufficient for L2/L3
boundary-placement checks and L3 end-to-end trace checks are performed
Skipping the auditor here would defeat
<!-- vpmodule:atom:end do-not-skip-the-deeper-check-because-the-shallow-one-found-nothing -->