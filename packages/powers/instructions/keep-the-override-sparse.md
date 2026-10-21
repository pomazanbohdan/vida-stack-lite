---
instruction_id: keep-the-override-sparse
title: Keep the override sparse
summary: The override carries only the fields that change; the whole source configuration is never copied into it.
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: An override file is composed.
conditions_does_not_apply_when: The configuration is written from scratch rather than as an override.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the changed fields only
artifact_contract_verified_by: the override holds only the fields that changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 4
---

# Keep the override sparse
Write only the changed fields; a full copy of the configuration file blocks later shipped defaults.
