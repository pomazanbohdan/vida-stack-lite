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
