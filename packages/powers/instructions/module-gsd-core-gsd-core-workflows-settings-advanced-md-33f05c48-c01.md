---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-settings-advanced-md-33f05c48-c01"
title: "gsd-core: gsd-core/workflows/settings-advanced.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/settings-advanced.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/settings-advanced.md\"}"
atom_ids:
  - override-only-the-fields-you-change
  - reject-an-invalid-value-and-re-prompt-that-field
  - resolve-the-config-path-once-and-use-it-everywhere
atom_count: 3
atoms: "[{\"atom_id\":\"override-only-the-fields-you-change\",\"file_sha256\":\"13d699a9e13999aaee801cbac6e563de69cc015b69ef5044323645b290666c27\",\"content_sha256\":\"9ebc9f857324736c76dede91af6905e4e90c6b7ab7d592c91df6e16964b1f733\",\"file_bytes\":2051,\"body_bytes\":630},{\"atom_id\":\"reject-an-invalid-value-and-re-prompt-that-field\",\"file_sha256\":\"68b75a5260b92ccb9c23b2427684369893333d75e7cb8a15e664722c529c951a\",\"content_sha256\":\"b2babced508d1641d11757524f17a64b19a9e863c2b7aa5eb6a7d28f0bc23331\",\"file_bytes\":1413,\"body_bytes\":258},{\"atom_id\":\"resolve-the-config-path-once-and-use-it-everywhere\",\"file_sha256\":\"43551fb30f4be8e0fe68edfa5a716e5233317ebd228486bef8114739f57557c7\",\"content_sha256\":\"ee154c08c5c25dec22516d16b55d38e1bdb9c981996807defe510cfe0c68e4fd\",\"file_bytes\":1613,\"body_bytes\":208}]"
carrier_sha256: 41846ea91faf63e7c7ef56eaf061842410b71eb7c6b633809edf786003655aac
carrier_bytes: 5516
revision: 1
status: active
---
<!-- vpmodule:atom:begin override-only-the-fields-you-change -->
---
instruction_id: override-only-the-fields-you-change
title: Override only the fields you change
summary: "Write a sparse override with only the changed fields, so every omitted field stays inherited and the next update is not silently shadowed."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An installed behaviour is changed by an override on top of the shipped defaults.
conditions_does_not_apply_when: "The behaviour is written from scratch, with no installed default underneath."
artifact_contract_output_type: sparse-override
artifact_contract_required_data:
  - the changed fields
  - the inherited fields
  - the layer
artifact_contract_verified_by: the override holds only the fields that changed and the merged result still carries the current defaults
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/customize/customize-bmad.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Override only the fields you change
Instead, create sparse override files that contain only the fields you change.
Every field you omit is inherited from the layer below.
A full copy locks in today's defaults, so the next update ships new values that your override silently shadows.
Trim the override back to only the fields you changed.
An override cannot delete a base item.
The resolver reads three files and the highest wins:
Apply each chosen value so unrelated keys are never clobbered
preserve every unrelated key — do not clobber siblings
Never emit a full overwrite of the file that omits keys the user did not touch
<!-- vpmodule:atom:end override-only-the-fields-you-change -->
<!-- vpmodule:atom:begin reject-an-invalid-value-and-re-prompt-that-field -->
---
instruction_id: reject-an-invalid-value-and-re-prompt-that-field
title: Reject an invalid value and re-prompt that field
summary: A value that fails validation is rejected by name and only that field is asked again; an empty answer keeps the current value and an invalid number is never coerced.
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A value is typed into a field that has an accepted shape.
conditions_does_not_apply_when: The value comes from a fixed list.
artifact_contract_output_type: field-validation
artifact_contract_required_data:
  - the rejected value
  - the field it was rejected for
  - the value that was kept
artifact_contract_verified_by: the invalid value was rejected by name and the field was asked again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reject an invalid value and re-prompt that field
the workflow MUST reject it, state which value was invalid, and re-prompt that single field
An empty input means "keep current" — the existing value is retained
Non-numeric input is never silently coerced
<!-- vpmodule:atom:end reject-an-invalid-value-and-re-prompt-that-field -->
<!-- vpmodule:atom:begin resolve-the-config-path-once-and-use-it-everywhere -->
---
instruction_id: resolve-the-config-path-once-and-use-it-everywhere
title: Resolve the config path once and use it everywhere
summary: "The configuration file is resolved once and every read and write goes through it, because the active installation may live somewhere else than the default path."
capability_tags:
  - write-configuration-override
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A configuration file is read and then written in the same run.
conditions_does_not_apply_when: There is exactly one configuration file and it never moves.
artifact_contract_output_type: resolved-config-path
artifact_contract_required_data:
  - the resolved path
  - the reads and writes that used it
artifact_contract_verified_by: every read and write used the resolved path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-advanced.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Resolve the config path once and use it everywhere
all subsequent reads and writes use this path, not a hardcoded
Every subsequent read/write uses it
workstream installs must route to their own config file
<!-- vpmodule:atom:end resolve-the-config-path-once-and-use-it-everywhere -->