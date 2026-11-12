---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-modes-edit-md-ab76101e-c01"
title: "bmad-method: skills/bmad-toolsmith/modes/edit.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/modes/edit.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/modes/edit.md\"}"
atom_ids:
  - cut-the-dead-lines-and-edit-the-sources
  - rebuild-instead-of-editing-when-the-outcomes-change
atom_count: 2
atoms: "[{\"atom_id\":\"cut-the-dead-lines-and-edit-the-sources\",\"file_sha256\":\"f2505b902f7fce27c5554dabcd68d185ed615a73e69dd59bd6f49033caa43c28\",\"content_sha256\":\"835a03e9c40906cc0f4894cb43fe08bb1ce458a18bb44153f215287b3bf2580b\",\"file_bytes\":1523,\"body_bytes\":397},{\"atom_id\":\"rebuild-instead-of-editing-when-the-outcomes-change\",\"file_sha256\":\"4774fca902e629a885a365aaa21fd3775d45bcb7c0f68b73e0ac3ccaf60edffc\",\"content_sha256\":\"0e8475b2703dc3db809819fcab9856210a24fcffda3a56e95f76ecb3d5dd87dd\",\"file_bytes\":1405,\"body_bytes\":257}]"
carrier_sha256: ed2d844bb884f72cd184213bc064054aa61516b2daedd8ee266c56f591e46f4a
carrier_bytes: 3223
revision: 1
status: active
---
<!-- vpmodule:atom:begin cut-the-dead-lines-and-edit-the-sources -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/edit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Cut the dead lines and edit the sources
Cut any line the change makes dead. Fit the existing voice and structure, so a reader sees no seam.
When the change touches the description or adds a capability, extend the trigger cases with queries for the new ground and near misses beside it, so the trigger eval covers what changed.
For a rendered skill, edit the sources
never the rendered snapshot.
<!-- vpmodule:atom:end cut-the-dead-lines-and-edit-the-sources -->
<!-- vpmodule:atom:begin rebuild-instead-of-editing-when-the-outcomes-change -->
---
instruction_id: rebuild-instead-of-editing-when-the-outcomes-change
title: Rebuild instead of editing when the outcomes change
summary: "A rethink from the outcomes is a build, not an edit, and the old files become reference material rather than the starting point."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The user wants to rethink what a tool produces rather than adjust it.
conditions_does_not_apply_when: The requested change is local and leaves the outcomes alone.
artifact_contract_output_type: rebuild-decision
artifact_contract_required_data:
  - the decision to rebuild
  - the old files as reference material
artifact_contract_verified_by: the rebuild is announced and the old files are not used as the starting point
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/edit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Rebuild instead of editing when the outcomes change
When the user wants to rethink the skill from its outcomes rather than adjust it, that is a build: say so
with the old skill as the mined input. Its files are reference material, not the starting point.
<!-- vpmodule:atom:end rebuild-instead-of-editing-when-the-outcomes-change -->