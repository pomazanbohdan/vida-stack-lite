---
instruction_id: change-the-source-not-the-installed-copy
title: "Change the source, not the installed copy"
summary: "A change written into an installed copy is overwritten by the next update, so the change belongs in the source repository; to extend a shared method inside a project, make your own module with your own prefix."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A change to a shared artifact is being made in a project that installs it.
conditions_does_not_apply_when: The artifact is your own and has no upstream.
artifact_contract_output_type: change-plan
artifact_contract_required_data:
  - the source repository
  - the installed copy
  - the own module that carries the change
artifact_contract_verified_by: the change survives the next update of the installed artifact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/how-to-add-to-module.md
status: active
revision: 1
---

# Change the source, not the installed copy
a skill written into the installed copy is overwritten by the next update, so build it in the source repository
Do not add to the installed method record; the next update overwrites it.
Make your own module with your own prefix
whose skills require or recommend the method skills they build on
