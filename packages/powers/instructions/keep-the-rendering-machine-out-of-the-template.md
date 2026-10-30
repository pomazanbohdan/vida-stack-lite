---
instruction_id: keep-the-rendering-machine-out-of-the-template
title: Keep the rendering machine out of the template
summary: A template that becomes a committed artefact carries no value baked in by the machine that renders it.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A template produces an artefact that is committed and used elsewhere.
conditions_does_not_apply_when: The file is the artefact itself and is not reused as a template.
artifact_contract_output_type: template-rule
artifact_contract_required_data:
  - the render-time expression
  - the form the consumer receives
  - the form the template keeps
artifact_contract_verified_by: the produced artefact carries no value from the rendering machine
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the rendering machine out of the template
Template files become artifacts (for example plan files) that are committed and used on other machines.
The distinction between `{{name}}` and `{{ config.name }}` matters: the first is an artifact placeholder the consumer of the generated document fills in later; the second is a value baked in at render time.
Remove the expression.
Use single-curly `{var}` if the value should be resolved at runtime by the consumer of the generated artifact, or plain double-curly `{{var}}` if it is a placeholder the consumer fills in.
