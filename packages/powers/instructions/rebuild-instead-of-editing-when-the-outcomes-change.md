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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/edit.md
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
