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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-advanced.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-integrations.md
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
