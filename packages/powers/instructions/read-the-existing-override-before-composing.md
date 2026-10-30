---
instruction_id: read-the-existing-override-before-composing
title: Read the existing override before composing
summary: "An existing override is read and summarized first, and the new change is framed as additive."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A team or user override already exists for the target.
conditions_does_not_apply_when: No override exists yet for the target.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - what is already overridden
  - the new change framed as additive
artifact_contract_verified_by: the existing override was read and summarized before the new one was composed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the existing override before composing
If a team or user override already exists, read it first and summarize what's already overridden before composing.
Translate plain-English into TOML against the target's configuration fields. If an existing override was read, frame the change as additive.
