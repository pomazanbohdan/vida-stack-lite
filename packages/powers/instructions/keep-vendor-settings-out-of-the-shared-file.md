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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/skill-anatomy.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/advanced-per-agent-configuration.md
status: active
revision: 1
---

# Keep the vendor settings out of the shared file
Skills are intentionally portable.

Top-level keys are limited to the specification fields: `name`, `description`, `license`, `compatibility`, `metadata`, and the experimental `allowed-tools`.

Vendor or runtime controls such as `model`, `tools`, `max_turns`, or `context` go under `metadata` or in a separate per-agent adapter file.

The validator rejects any other top-level key.

Unknown top-level fields are not guaranteed to be ignored. Many parsers only read `name` and `description` and silently drop the rest, but a strict spec-conformant validator or client may flag or reject unrecognized top-level keys. Putting vendor fields under `metadata` keeps the file conformant everywhere.

**Opt-in, not global.** Runtime controls should be something a user adds for their own agent and workflow, not a default baked into every skill in the repository.
