---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-host-integration-interface-md-a9270359-c01"
title: "gsd-core: docs/reference/host-integration-interface.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/reference/host-integration-interface.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/host-integration-interface.md\"}"
atom_ids:
  - declare-the-undocumented-sentinel-instead-of-assuming-a-capability
  - keep-the-serialized-and-the-in-process-forms-equivalent
atom_count: 2
atoms: "[{\"atom_id\":\"declare-the-undocumented-sentinel-instead-of-assuming-a-capability\",\"file_sha256\":\"9376a15a91b57b374dd9f3d68d08d10196b8ba084fc2a3867c4af9c819108674\",\"content_sha256\":\"d7e557040883b118e813d862d7f1ef559e878d3ad2844dbb806d231d87686e2a\",\"file_bytes\":1531,\"body_bytes\":302},{\"atom_id\":\"keep-the-serialized-and-the-in-process-forms-equivalent\",\"file_sha256\":\"b7bede5a7a0f69eadeced3ee76f011a968f29057a1c3ab4f7e7186c2ce717579\",\"content_sha256\":\"73b43d5eeecf5bcb43f204d2ca8d00055f6dca3b26f91da7f8048d85ed6ab348\",\"file_bytes\":1498,\"body_bytes\":321}]"
carrier_sha256: 16513828158febc6250674c030d6c8fd437819498ea519ec3ac55fe8efa7bc0b
carrier_bytes: 3386
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-the-undocumented-sentinel-instead-of-assuming-a-capability -->
---
instruction_id: declare-the-undocumented-sentinel-instead-of-assuming-a-capability
title: Declare the undocumented sentinel instead of assuming a capability
summary: "A value the host's own documentation does not state is declared as the unknown sentinel and the engine fails closed; nothing is inferred from the context."
capability_tags:
  - harden-security-controls
pattern_tags:
  - safe-defaults
conditions_applies_when: A capability is being declared for a host whose documentation is silent about it.
conditions_does_not_apply_when: "The host's documentation states the value."
artifact_contract_output_type: undocumented-sentinel
artifact_contract_required_data:
  - the axis that is not documented
  - the sentinel that is declared
  - how the engine treats it
artifact_contract_verified_by: the silent axis was declared as the sentinel and the engine failed closed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/host-integration-interface.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Declare the undocumented sentinel instead of assuming a capability
- every axis value a host declares must come from that host's authoritative documentation.
- Where docs are silent, the host declares the `undocumented` sentinel and the engine degrades fail-closed — it never assumes a capability.
<!-- vpmodule:atom:end declare-the-undocumented-sentinel-instead-of-assuming-a-capability -->
<!-- vpmodule:atom:begin keep-the-serialized-and-the-in-process-forms-equivalent -->
---
instruction_id: keep-the-serialized-and-the-in-process-forms-equivalent
title: Keep the serialized and the in-process forms equivalent
summary: The form that crosses a wire and the form that runs in one process produce the same result; a change that breaks that equivalence is a breaking change.
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A contract has an in-process form and a form that is serialized across a boundary.
conditions_does_not_apply_when: The contract has only one form.
artifact_contract_output_type: form-equivalence
artifact_contract_required_data:
  - the two forms
  - the result they must share
  - what a divergence means
artifact_contract_verified_by: both forms produced the same result and the equivalence is asserted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/host-integration-interface.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Keep the serialized and the in-process forms equivalent
- The two are consistent: a serialized request yields the same `effective` axes as the in-process call.
- All five satisfy a common `{ kind, runtime, install, uninstall }` shape and are constructed fail-closed (they throw if a required host primitive is absent):
<!-- vpmodule:atom:end keep-the-serialized-and-the-in-process-forms-equivalent -->