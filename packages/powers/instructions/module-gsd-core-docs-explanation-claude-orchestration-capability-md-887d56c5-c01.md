---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-claude-orchestration-capability-md-887d56c5-c01"
title: "gsd-core: docs/explanation/claude-orchestration-capability.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/explanation/claude-orchestration-capability.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/claude-orchestration-capability.md\"}"
atom_ids:
  - assert-the-default-path-still-works-when-the-optional-backend-is-off
  - change-the-vehicle-not-the-artifacts
atom_count: 2
atoms: "[{\"atom_id\":\"assert-the-default-path-still-works-when-the-optional-backend-is-off\",\"file_sha256\":\"06a88f1ab269fc3ca4f7635447ff1f167523f2fa8b26b9a096488dbb00df0b8e\",\"content_sha256\":\"24c9116c033330588394183e0fd7abe382e5bd13357fdd87663c2de64cb8526c\",\"file_bytes\":1480,\"body_bytes\":254},{\"atom_id\":\"change-the-vehicle-not-the-artifacts\",\"file_sha256\":\"1380785602bd1f7e273f39182618fb1be2e2acf52d4acb2efb8f61607dc89baa\",\"content_sha256\":\"c59886d5e03e154a843f57bbc553ea3ecc3a43a77c2276727c68b18f7008ec82\",\"file_bytes\":1325,\"body_bytes\":148}]"
carrier_sha256: eff49185fc8fe7639154bfa8c6968ec6838adee57ddae036f6598873242c630e
carrier_bytes: 3128
revision: 1
status: active
---
<!-- vpmodule:atom:begin assert-the-default-path-still-works-when-the-optional-backend-is-off -->
---
instruction_id: assert-the-default-path-still-works-when-the-optional-backend-is-off
title: Assert the default path still works when the optional backend is off
summary: An optional backend is shipped default-off and a regression test asserts the standard path on every combination where the backend is not available.
capability_tags:
  - verify-work-results
pattern_tags:
  - staged-exposure
conditions_applies_when: An optional execution backend is being introduced.
conditions_does_not_apply_when: The backend is the only way the work can run.
artifact_contract_output_type: default-path-regression
artifact_contract_required_data:
  - the combinations that are asserted
  - the standard path that is asserted
  - the default state of the backend
artifact_contract_verified_by: the standard path is asserted on every combination where the backend is unavailable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Assert the default path still works when the optional backend is off
- This is a release gate, not a nicety: a regression test asserts the inline fallback on every non-capable combination, so the capability is default-off and low-risk by construction.
<!-- vpmodule:atom:end assert-the-default-path-still-works-when-the-optional-backend-is-off -->
<!-- vpmodule:atom:begin change-the-vehicle-not-the-artifacts -->
---
instruction_id: change-the-vehicle-not-the-artifacts
title: "Change the vehicle, not the artifacts"
summary: Replacing the mechanism that carries out the work leaves the artifacts it produces and the commits it makes identical; only the vehicle changes.
capability_tags:
  - design-structure
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A second mechanism is introduced to carry out work that already has one.
conditions_does_not_apply_when: The work has no existing mechanism to preserve.
artifact_contract_output_type: same-artifacts-new-vehicle
artifact_contract_required_data:
  - the mechanism before and after
  - the artifacts that must stay identical
  - what is allowed to differ
artifact_contract_verified_by: the artifacts and the commits are identical and only the vehicle differs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Change the vehicle, not the artifacts
- it produces the same `SUMMARY.md` artifacts and commits — the only difference is the execution vehicle.
<!-- vpmodule:atom:end change-the-vehicle-not-the-artifacts -->