---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-capabilities-ai-integration-fragments-api-coverage-plan-pre-md-46439168-c01"
title: "gsd-core: capabilities/ai-integration/fragments/api-coverage-plan-pre.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:capabilities/ai-integration/fragments/api-coverage-plan-pre.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"capabilities/ai-integration/fragments/api-coverage-plan-pre.md\"}"
atom_ids:
  - default-to-full-coverage-and-decide-every-capability
  - do-not-read-a-skipped-probe-as-a-negative-verdict
  - re-decide-the-whole-surface-for-a-second-integration
atom_count: 3
atoms: "[{\"atom_id\":\"default-to-full-coverage-and-decide-every-capability\",\"file_sha256\":\"86aac34305e9a48fa3623133422a89c12de045a757b0a62a6f6b21ae364f72af\",\"content_sha256\":\"0403991c6046e66f30d6c0ea68f1d38c2385d3a486fec614a52c04f3601d9ec7\",\"file_bytes\":1590,\"body_bytes\":354},{\"atom_id\":\"do-not-read-a-skipped-probe-as-a-negative-verdict\",\"file_sha256\":\"db7098b8892ec89bc3b83ed81043a91057aebf88955c1f528a62589eedca44e2\",\"content_sha256\":\"7881fe9782ef0a91e882971b216d489194c322559405303936e0c422fdd88e5a\",\"file_bytes\":1655,\"body_bytes\":397},{\"atom_id\":\"re-decide-the-whole-surface-for-a-second-integration\",\"file_sha256\":\"5e3c5c8c6aff8374f3513a93f4286b712357522ffd57a4931d365448f3f738c1\",\"content_sha256\":\"71c6b7126da16d3dbc362241e14bc247f8869e1eef2a26df755850bad3fe353b\",\"file_bytes\":1594,\"body_bytes\":379}]"
carrier_sha256: 2c425b2205793999722cc09b4e24ed16dee1ab0d9df7be1008e38a69daa1d234
carrier_bytes: 5318
revision: 1
status: active
---
<!-- vpmodule:atom:begin default-to-full-coverage-and-decide-every-capability -->
---
instruction_id: default-to-full-coverage-and-decide-every-capability
title: Default to full coverage and decide every capability
summary: "When an integration exposes a set of capabilities, the whole set is enumerated and one decision is recorded per capability, with a reason for every exclusion."
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: An integration with an enumerable capability surface is about to be built.
conditions_does_not_apply_when: "The surface cannot be enumerated, so there is nothing to decide."
artifact_contract_output_type: coverage-matrix
artifact_contract_required_data:
  - the enumerated capability surface
  - the decision per capability
  - the reason for every exclusion
artifact_contract_verified_by: every capability carries a decision and every exclusion carries a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/ai-integration/fragments/api-coverage-plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Default to full coverage and decide every capability
- Every capability starts as INTEGRATE; the matrix is the *subtraction record*.
- Every `OPT-OUT` MUST carry a one-line reason (`not needed`, `not needed yet`, `explicitly out of scope`, …).
- An opt-out without a reason is an un-decided hole — the exact failure mode this gate exists to close.
<!-- vpmodule:atom:end default-to-full-coverage-and-decide-every-capability -->
<!-- vpmodule:atom:begin do-not-read-a-skipped-probe-as-a-negative-verdict -->
---
instruction_id: do-not-read-a-skipped-probe-as-a-negative-verdict
title: Do not read a skipped probe as a negative verdict
summary: A probe that could not examine its input reports that it did not run; that report is never read as the opposite verdict.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A machine probe returned a result and its status is being interpreted.
conditions_does_not_apply_when: The probe ran and returned a real verdict.
artifact_contract_output_type: probe-verdict
artifact_contract_required_data:
  - the probe status
  - the verdict field
  - what the payload did not contain
artifact_contract_verified_by: a skipped status was checked before the verdict was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/ai-integration/fragments/api-coverage-plan-pre.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/assumption-delta/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Do not read a skipped probe as a negative verdict
- **Check for `skipped` before reading `detected`**: a `skipped` payload is not a confirmed "no API integration" verdict, it means the detector never examined real input.
- Do not treat it as `detected:false`.
- Skip the checkpoint for this run rather than asserting a verdict about input that was never examined; do not raise it with the user.
<!-- vpmodule:atom:end do-not-read-a-skipped-probe-as-a-negative-verdict -->
<!-- vpmodule:atom:begin re-decide-the-whole-surface-for-a-second-integration -->
---
instruction_id: re-decide-the-whole-surface-for-a-second-integration
title: Re-decide the whole surface for a second integration
summary: "When the same need is served by a second integration, every capability is decided again from the same full-coverage baseline; no exclusion is inherited silently."
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: A second integration of the same need is about to be planned.
conditions_does_not_apply_when: There is only one integration of the need.
artifact_contract_output_type: coverage-matrix
artifact_contract_required_data:
  - the need being served twice
  - the baseline each decision starts from
  - the re-decided capabilities
artifact_contract_verified_by: "the second integration's decisions were made fresh, not copied"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/ai-integration/fragments/api-coverage-plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Re-decide the whole surface for a second integration
- A second integration against the same need (e.g. a second platform for the same capability) starts from the **same full-coverage baseline** as the first.
- Do not carry over the first integration's opt-outs silently — re-decide each capability for the new surface, so a first-class/fallback asymmetry cannot accumulate.
<!-- vpmodule:atom:end re-decide-the-whole-surface-for-a-second-integration -->