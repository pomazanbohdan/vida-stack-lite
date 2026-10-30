---
instruction_id: record-available-executor-models
title: Record available executor models
summary: "During setup, list the providers and models that are actually selectable, and record which model serves each role."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "The environment is being configured, or the set of available models and providers changed."
conditions_does_not_apply_when: A current inventory exists and nothing changed the models.
artifact_contract_output_type: executor-inventory
artifact_contract_required_data:
  - providers
  - models
  - families
  - role assignments
  - availability confirmation
artifact_contract_verified_by: every recorded model is selectable in the environment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/setup-benny/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record the available executor models

Use only model identifiers that are shown as available in the environment. Do not guess an identifier and do not carry over a private default.

Record, for every provider that is available: the provider id, every model with its family, and the roles the model can serve (main or agent). Mark each model with whether it is available right now.

Assign a model to each role and to each verification lane, and say which model serves the verification lane.

Keep the inventory of the user outside the delivered package: the configuration, the feature maps and the routing maps stay with the user, and nothing in them is overwritten or copied into the package.

Reference the files of the delivered package only by stable repository-relative paths, and only after you confirmed that they are committed; never reference a source directory or a cache path.

Never put a secret value in a package file, a prompt or a committed configuration.
