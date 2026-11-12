---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-verification-overrides-md-deb8ea38-c01"
title: "gsd-core: gsd-core/references/verification-overrides.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/verification-overrides.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/verification-overrides.md\"}"
atom_ids:
  - do-not-override-in-bulk
  - give-an-overridden-item-a-status-of-its-own
  - require-a-reason-and-an-acceptor-for-every-override
atom_count: 3
atoms: "[{\"atom_id\":\"do-not-override-in-bulk\",\"file_sha256\":\"d37c3191e3e62d68be3fa1afb2403262e683cdf023ec28465290a9024e834bdf\",\"content_sha256\":\"fd679b7daaca75ddc2d1946ecff89fda412b91f543bd366de802fbb0e59d0e8c\",\"file_bytes\":1456,\"body_bytes\":391},{\"atom_id\":\"give-an-overridden-item-a-status-of-its-own\",\"file_sha256\":\"53113a5b88af8ab784c7d442a09ca16b59c606662e5ef140901d72f09cdf1da9\",\"content_sha256\":\"50d0fd2d6305c8ddb79b7af460b0d933f46a96f2d5d8bb98b94ddb4290253af3\",\"file_bytes\":1644,\"body_bytes\":562},{\"atom_id\":\"require-a-reason-and-an-acceptor-for-every-override\",\"file_sha256\":\"3f188c72065573d42c06b639d5a4f3841fb9e6695041da51f21d35b8607e4a69\",\"content_sha256\":\"a9e0d064d908c258138a8192913497883700673a4f1b01ef06a0c4c3e26fe086\",\"file_bytes\":1432,\"body_bytes\":379}]"
carrier_sha256: 6f2f20537dcdac47a9e6d9890b5f9dc65e10da6b8d416bab3bcd6b3713ec0492
carrier_bytes: 4939
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-override-in-bulk -->
---
instruction_id: do-not-override-in-bulk
title: Do not override in bulk
summary: "An override is for an intentional deviation; an incomplete implementation, an unclear must-have or a whole batch of failures is not an override."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: Several must-haves failed for the same phase.
conditions_does_not_apply_when: One intentional deviation is being accepted.
artifact_contract_output_type: override-decision
artifact_contract_required_data:
  - the failed must-haves
  - the decision taken
artifact_contract_verified_by: the plan was revisited instead of the failures being overridden in bulk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verification-overrides.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Do not override in bulk
Overrides are NOT appropriate when:
- The implementation is simply incomplete — fix it instead
- The must-have is unclear — clarify it instead
- The developer wants to skip verification — that undermines the process
- Multiple must-haves are failing for the same phase — if more than 2-3 items need overrides, revisit the plan instead of overriding in bulk
<!-- vpmodule:atom:end do-not-override-in-bulk -->
<!-- vpmodule:atom:begin give-an-overridden-item-a-status-of-its-own -->
---
instruction_id: give-an-overridden-item-a-status-of-its-own
title: Give an overridden item a status of its own
summary: "An overridden item has a status distinct from both verified and failed, it counts as passing, and it never removes a human-needed item."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: An overridden must-have appears in a verification table.
conditions_does_not_apply_when: No override was applied.
artifact_contract_output_type: override-status
artifact_contract_required_data:
  - the status
  - the reason
  - the acceptor
artifact_contract_verified_by: the status is visually distinct and the evidence names the reason and the acceptor
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verification-overrides.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Give an overridden item a status of its own
The `PASSED (override)` status must be visually distinct from both `VERIFIED` and `FAILED`. In the evidence column, include the override reason and who accepted it
`PASSED (override)` items count toward the passing score, not the failing score
Overrides do NOT suppress `human_needed` items — those still require human testing
If the underlying code now satisfies the must-have, the override becomes unnecessary — mark as VERIFIED instead
Overrides are never removed automatically; they persist as documentation
<!-- vpmodule:atom:end give-an-overridden-item-a-status-of-its-own -->
<!-- vpmodule:atom:begin require-a-reason-and-an-acceptor-for-every-override -->
---
instruction_id: require-a-reason-and-an-acceptor-for-every-override
title: Require a reason and an acceptor for every override
summary: "An override names what it overrides, why the deviation is acceptable, who accepted it and when."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: An override of a failed must-have is declared.
conditions_does_not_apply_when: No must-have is being overridden.
artifact_contract_output_type: override-record
artifact_contract_required_data:
  - the overridden must-have
  - the reason
  - the acceptor
  - the timestamp
artifact_contract_verified_by: all four fields are present and the reason is specific
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verification-overrides.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Require a reason and an acceptor for every override
Why this deviation is acceptable. Must be specific — not just "not needed"
Who accepted the override (username or role). Required
ISO timestamp of when the override was accepted. Required
The must-have truth, artifact description, or key link being overridden. Does not need to be an exact match — fuzzy matching applies
<!-- vpmodule:atom:end require-a-reason-and-an-acceptor-for-every-override -->