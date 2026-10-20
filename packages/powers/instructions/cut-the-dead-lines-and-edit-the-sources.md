---
instruction_id: cut-the-dead-lines-and-edit-the-sources
title: Cut the dead lines and edit the sources
summary: "A change removes the lines it makes dead, fits the existing voice, and is made in the source the artefact is generated from."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - code-minimization
conditions_applies_when: An existing skill or tool is changed.
conditions_does_not_apply_when: Nothing exists yet and the work is a build.
artifact_contract_output_type: applied-change
artifact_contract_required_data:
  - the lines the change made dead
  - the changed description
  - the trigger cases for the new ground
artifact_contract_verified_by: "no line the change made dead is left, and the trigger cases cover what changed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/edit.md
status: active
revision: 1
---

# Cut the dead lines and edit the sources
Cut any line the change makes dead. Fit the existing voice and structure, so a reader sees no seam.
When the change touches the description or adds a capability, extend the trigger cases with queries for the new ground and near misses beside it, so the trigger eval covers what changed.
For a rendered skill, edit the sources
never the rendered snapshot.
