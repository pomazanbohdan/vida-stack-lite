---
instruction_id: read-every-declared-value-in-the-body
title: Read every declared value in the body
summary: "A value the skill declares as overridable has to be read by the body; a declared value that is hardcoded instead is a defect, because every override of it would be a silent no-op."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill declares a value that a team or a person can override.
conditions_does_not_apply_when: The skill declares nothing.
artifact_contract_output_type: agent-skill
artifact_contract_required_data:
  - the declared values
  - the place in the body that reads each one
artifact_contract_verified_by: changing a declared value changes what the run does
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-customization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read every declared value in the body
It declares what can change: steps to run before or after activation, standing facts to hold for the run, a hook to run on completion, an output path, and the skill's own settings, each commented with when to override it.
The body reads every declared value, so a value declared but hardcoded in the body is a defect: every override would be a silent no-op.
What customization is not: boolean toggles (a switch means the author never decided), persona fields in a workflow, or a settings concept of the skill's own.
