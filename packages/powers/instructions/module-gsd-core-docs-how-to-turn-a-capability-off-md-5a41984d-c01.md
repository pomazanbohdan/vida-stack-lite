---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-turn-a-capability-off-md-5a41984d-c01"
title: "gsd-core: docs/how-to/turn-a-capability-off.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/turn-a-capability-off.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/turn-a-capability-off.md\"}"
atom_ids:
  - define-off-as-off-across-every-surface
  - gate-the-hook-when-there-is-no-surface-to-unsurface
atom_count: 2
atoms: "[{\"atom_id\":\"define-off-as-off-across-every-surface\",\"file_sha256\":\"022a0a09fd2a386491e537e37d016f99edc251c6f1e3bf37488ef5882dd7c78b\",\"content_sha256\":\"7f64b33f2edd5c5e6d039b465a23cc5064caf9f979d7dc81fc48c63a74c27d81\",\"file_bytes\":1271,\"body_bytes\":249},{\"atom_id\":\"gate-the-hook-when-there-is-no-surface-to-unsurface\",\"file_sha256\":\"4a1f1b609cc4542504fcc57a8d34e2fd1bb273bcb4907d7cca5bf3f0ab4ef1f7\",\"content_sha256\":\"a1a8b8a1571f30b0802f06738063ce5c3fa43f49567e25c5ff29abcb005ee1a3\",\"file_bytes\":1398,\"body_bytes\":341}]"
carrier_sha256: 7cbfda361f5a4c4e63d3589631e1ceac9a405e0a0e1926f9f47dc5a6a921f38f
carrier_bytes: 2962
revision: 1
status: active
---
<!-- vpmodule:atom:begin define-off-as-off-across-every-surface -->
---
instruction_id: define-off-as-off-across-every-surface
title: Define off as off across every surface
summary: "A capability is off only when it is neither installed, nor surfaced, nor has a live hook."
capability_tags:
  - write-configuration-override
pattern_tags:
  - safe-defaults
conditions_applies_when: A capability is switched off.
conditions_does_not_apply_when: The capability only has hooks and no skills to unsurface.
artifact_contract_output_type: capability-state
artifact_contract_required_data:
  - the three surfaces the state is resolved from
  - the state that was set
artifact_contract_verified_by: "the state is off across installation, surface and hooks"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/turn-a-capability-off.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Define off as off across every surface
The installer resolves one capability state from three places: whether the capability is installed, whether it is surfaced, and whether each of its hooks is gated in config. "Off" means off across all three.
<!-- vpmodule:atom:end define-off-as-off-across-every-surface -->
<!-- vpmodule:atom:begin gate-the-hook-when-there-is-no-surface-to-unsurface -->
---
instruction_id: gate-the-hook-when-there-is-no-surface-to-unsurface
title: Gate the hook when there is no surface to unsurface
summary: "A capability that contributes only hooks is switched off by gating them, because disabling it changes nothing."
capability_tags:
  - write-configuration-override
pattern_tags:
  - safe-defaults
conditions_applies_when: A capability that owns no skills is about to be switched off.
conditions_does_not_apply_when: The capability has skills that can be unsurfaced.
artifact_contract_output_type: hook-gate
artifact_contract_required_data:
  - the capability
  - the hook that is gated
artifact_contract_verified_by: the hook no longer fires and the capability stays installed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/turn-a-capability-off.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Gate the hook when there is no surface to unsurface
Some capabilities (for example, `research`) contribute only hooks and agents — they have no skills to unsurface, so disabling them via the surface has no effect. Switch these off by gating their hooks instead
The capability now reports `enabled: false` and every hook `active: false`.
<!-- vpmodule:atom:end gate-the-hook-when-there-is-no-surface-to-unsurface -->