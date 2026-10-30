---
instruction_id: pin-only-what-the-whole-team-must-share
title: Pin only what the whole team must share
summary: "Output locations and shared paths are pinned in the shared configuration, and only what the whole team must share is pinned there."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: An output location or a shared path is pinned in the shared configuration.
conditions_does_not_apply_when: The path is personal and only one person needs it.
artifact_contract_output_type: shared-paths
artifact_contract_required_data:
  - the paths that are pinned
  - the team members who must share them
artifact_contract_verified_by: nothing is pinned that only one member of the team needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Pin only what the whole team must share
Output locations and shared paths, pinned in central config.
Pin only what the whole team must share.
