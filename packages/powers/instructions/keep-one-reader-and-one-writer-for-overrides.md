---
instruction_id: keep-one-reader-and-one-writer-for-overrides
title: Keep one reader and one writer for the overrides
summary: "The overrides live outside the skill and are written by one component and read by another; the skill never writes its own overrides, never ships its own merge script and never carries a second code path."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A skill reads override values that somebody else writes.
conditions_does_not_apply_when: There are no overrides.
artifact_contract_output_type: override-contract
artifact_contract_required_data:
  - the reader
  - the writer
  - what the skill must not do itself
artifact_contract_verified_by: the skill never writes its own overrides
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-customization.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-agent.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 2
---

# Keep one reader and one writer for the overrides
One reader, one writer.
A skill never writes its own overrides, never ships its own merge script, and never carries a second code path
The three layers merge when the skill activates: scalars override, arrays append, arrays of tables merge by `code` or `id`.
So a team can add a capability, change the communication style or add an activation step without forking.
When users will change a value, one line in the body says to invoke the customization skill and name the key.
