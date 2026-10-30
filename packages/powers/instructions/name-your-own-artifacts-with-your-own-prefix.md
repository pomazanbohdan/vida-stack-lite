---
instruction_id: name-your-own-artifacts-with-your-own-prefix
title: Name your own artifacts with your own prefix
summary: "Name your own skills and modules after the organisation or module they belong to, under a prefix of your own, so they sort together, read as yours and never collide with a future release of the vendor's."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A new skill, agent or module of your own has to be named."
conditions_does_not_apply_when: You are naming something the vendor itself ships.
artifact_contract_output_type: name
artifact_contract_required_data:
  - the prefix
  - the artifact names
  - the reason for the prefix
artifact_contract_verified_by: "the name tells your artifacts apart from the vendor's at a glance"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/naming.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name your own artifacts with your own prefix
Name skills after the org or module they belong to
A prefix of your own does three things.
It keeps a module's skills sorted together, so adding, removing and updating them is one glance.
A custom skill named with the vendor's prefix reads as official, collides with a future core skill, and hides in listings among the ones you did not write.
Use your own prefix instead.
Renaming a skill changes how it is invoked
