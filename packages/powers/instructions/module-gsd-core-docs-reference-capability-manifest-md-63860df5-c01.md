---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-capability-manifest-md-63860df5-c01"
title: "gsd-core: docs/reference/capability-manifest.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/reference/capability-manifest.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/capability-manifest.md\"}"
atom_ids:
  - enforce-the-declared-invariants-at-build-and-install-time
  - keep-the-dependency-tier-order-monotone
atom_count: 2
atoms: "[{\"atom_id\":\"enforce-the-declared-invariants-at-build-and-install-time\",\"file_sha256\":\"6b61c02b656a74424ed890d8ceab06c1bdcb41ddd39a3b7d2b116b6239fc96f4\",\"content_sha256\":\"decdfabc612716f6a7ab4712c0a887726055cf10104df9f1bc678e378b674183\",\"file_bytes\":1566,\"body_bytes\":406},{\"atom_id\":\"keep-the-dependency-tier-order-monotone\",\"file_sha256\":\"da08904bcf70cecdcc81a47cddf6de948e1a2bd2f52246251401d7e0189e062d\",\"content_sha256\":\"787ecc62fb51c6b251f791f644add4eba0bee5db668d4f949ac1c70539be1597\",\"file_bytes\":1351,\"body_bytes\":209}]"
carrier_sha256: f21e07765bd90aacbb8753eaf000d40777fe4f61c38835e64615c13686205391
carrier_bytes: 3224
revision: 1
status: active
---
<!-- vpmodule:atom:begin enforce-the-declared-invariants-at-build-and-install-time -->
---
instruction_id: enforce-the-declared-invariants-at-build-and-install-time
title: Enforce the declared invariants at build time and at install time
summary: "The invariants a declaration must satisfy are checked when the artifact is built and again when it is installed, by the same validation the registry uses."
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A set of invariants is declared for a manifest or a contract.
conditions_does_not_apply_when: The invariants are only written down in prose.
artifact_contract_output_type: declared-invariants
artifact_contract_required_data:
  - the invariants
  - where they are checked
  - the validation that checks them
artifact_contract_verified_by: the invariants are enforced at build time and at install time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/capability-manifest.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Enforce the declared invariants at build time and at install time
- The following invariants are enforced at **build time** by `scripts/gen-capability-registry.cjs` and at **install time** by the runtime-callable `validateCapability()` / `validateCrossCapability()`
- **`requires` exist and are acyclic.** Every `id` listed in `requires` must exist in the registry; the dependency graph must be acyclic.
<!-- vpmodule:atom:end enforce-the-declared-invariants-at-build-and-install-time -->
<!-- vpmodule:atom:begin keep-the-dependency-tier-order-monotone -->
---
instruction_id: keep-the-dependency-tier-order-monotone
title: Keep the dependency tier order monotone
summary: "A component never depends on one of a weaker tier: the strongest tier may depend on anything, the middle tier may not depend on the weakest, and the weakest depends on nothing of the sort."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: The dependencies between tiers are being declared.
conditions_does_not_apply_when: The tiers are not ordered by strength.
artifact_contract_output_type: tier-monotone-dependency
artifact_contract_required_data:
  - the tier that declares the dependency
  - the tier it depends on
  - the rule the order follows
artifact_contract_verified_by: no component depends on a weaker tier than its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/capability-manifest.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the dependency tier order monotone
- **`requires` is tier-monotone.** A `core` capability may not require a `standard` or `full` capability. A `standard` capability may not require a `full` capability.
<!-- vpmodule:atom:end keep-the-dependency-tier-order-monotone -->