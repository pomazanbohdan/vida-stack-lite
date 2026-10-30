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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/advanced-per-agent-configuration.md
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
