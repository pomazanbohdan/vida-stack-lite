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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/turn-a-capability-off.md
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
