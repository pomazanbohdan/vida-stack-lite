---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-docs-advanced-per-agent-configuration-md-af4badbf-c01"
title: "addy-skills: docs/advanced-per-agent-configuration.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:docs/advanced-per-agent-configuration.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"docs/advanced-per-agent-configuration.md\"}"
atom_ids:
  - generate-repetitive-configuration
  - keep-vendor-settings-out-of-the-shared-file
  - validate-semantics-not-just-shape
atom_count: 3
atoms: "[{\"atom_id\":\"generate-repetitive-configuration\",\"file_sha256\":\"eaf0d2fcc17bad95def143cb6f793f1b73ea29651a69de345b394d605e2fbb83\",\"content_sha256\":\"daada5ecedb60751ec85e6cd8b52dbf707f9c8d3fbc2ff918da067899e07c470\",\"file_bytes\":1860,\"body_bytes\":751},{\"atom_id\":\"keep-vendor-settings-out-of-the-shared-file\",\"file_sha256\":\"bc0a8d0043274509a04382a6fe2826863107d6875d1e7f7d5d04085ea801e63c\",\"content_sha256\":\"f3e5ee4159bbaa6bdd3f94669737752808f97f25674afd6858175990b13121b2\",\"file_bytes\":2242,\"body_bytes\":906},{\"atom_id\":\"validate-semantics-not-just-shape\",\"file_sha256\":\"656529c4e8f487d152521b0d6956dbdcba2278134a48701e66c983f10b610b1a\",\"content_sha256\":\"7294b0c1299cbadad1b636e1ce019f44a8fab2057f135ad15858a12d49e2cc5c\",\"file_bytes\":1446,\"body_bytes\":408}]"
carrier_sha256: 0870e50a91fef6c4373c0e1c98311812ec61af1f833911de31fe029ef3ac4471
carrier_bytes: 5939
revision: 1
status: active
---
<!-- vpmodule:atom:begin generate-repetitive-configuration -->
---
instruction_id: generate-repetitive-configuration
title: Generate the repetitive configuration
summary: Generate the per-client configuration from one source of truth instead of hand-editing a copy for every skill.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The same configuration must be produced for many artifacts or for several clients.
conditions_does_not_apply_when: The configuration is written once and never repeated.
artifact_contract_output_type: configuration-generator
artifact_contract_required_data:
  - source of truth
  - generated output
  - what the generator injects
artifact_contract_verified_by: the generated copies come from the generator and not from hand edits
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/advanced-per-agent-configuration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Generate the repetitive configuration
Prefer generation over hand-editing. Where a configuration is repetitive and mechanical, generate it from a single source of truth instead of maintaining copies by hand.

A generator reads a per-skill configuration map (which model, tool allowlist, turn limit, and isolation each skill should use for a given agent).

For metadata-style fields, it injects them under the `metadata` key of each `SKILL.md`, keeping the file spec-conformant.

For orchestration-style fields, it emits the separate adapter files an agent expects, for example subagent definitions, leaving `SKILL.md` untouched.

Maintaining per-agent metadata by hand across every skill is repetitive, drifts out of sync, and is easy to get wrong.
<!-- vpmodule:atom:end generate-repetitive-configuration -->
<!-- vpmodule:atom:begin keep-vendor-settings-out-of-the-shared-file -->
---
instruction_id: keep-vendor-settings-out-of-the-shared-file
title: Keep the vendor settings out of the shared file
summary: "Keep the shared skill file portable: only the specification's fields at the top level, and the vendor-specific controls under the metadata key or in a separate adapter file."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A setting is added to a shared skill file and it belongs to one client only.
conditions_does_not_apply_when: "The setting is one of the specification's own fields."
artifact_contract_output_type: portable-skill-file
artifact_contract_required_data:
  - setting
  - "its home: the metadata key or an adapter file"
  - specification fields kept
artifact_contract_verified_by: "the shared file carries no field outside the specification's list"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/skill-anatomy.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/advanced-per-agent-configuration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the vendor settings out of the shared file
Skills are intentionally portable.

Top-level keys are limited to the specification fields: `name`, `description`, `license`, `compatibility`, `metadata`, and the experimental `allowed-tools`.

Vendor or runtime controls such as `model`, `tools`, `max_turns`, or `context` go under `metadata` or in a separate per-agent adapter file.

The validator rejects any other top-level key.

Unknown top-level fields are not guaranteed to be ignored. Many parsers only read `name` and `description` and silently drop the rest, but a strict spec-conformant validator or client may flag or reject unrecognized top-level keys. Putting vendor fields under `metadata` keeps the file conformant everywhere.

**Opt-in, not global.** Runtime controls should be something a user adds for their own agent and workflow, not a default baked into every skill in the repository.
<!-- vpmodule:atom:end keep-vendor-settings-out-of-the-shared-file -->
<!-- vpmodule:atom:begin validate-semantics-not-just-shape -->
---
instruction_id: validate-semantics-not-just-shape
title: "Validate semantics, not just shape"
summary: "Make the generator check the values it writes, not only the shape of the file it writes them into."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A generator or a checker writes configuration values it can verify.
conditions_does_not_apply_when: The tool only copies text it does not interpret.
artifact_contract_output_type: semantic-validation
artifact_contract_required_data:
  - checked values
  - known valid values
  - rejected value
artifact_contract_verified_by: an invalid value in the checked set is rejected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/advanced-per-agent-configuration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Validate semantics, not just shape
Generation also lets the tooling validate **semantics, not just shape**: confirm that a model name is a known model, that a tool name is a real tool, that `max_turns` is a positive integer, and that `temperature` (where still applicable) is a valid number in range.

Shape-only checks let invalid values such as `parseInt("1.5")` or `parseFloat("0.2oops")` slip through.
<!-- vpmodule:atom:end validate-semantics-not-just-shape -->