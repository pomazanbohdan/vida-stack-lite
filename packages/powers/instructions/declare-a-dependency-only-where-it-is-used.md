---
instruction_id: declare-a-dependency-only-where-it-is-used
title: Declare a dependency only where it is used
summary: "A dependency is required when the tool invokes it, recommended when it helps beside it, and nothing otherwise."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-minimization
conditions_applies_when: The dependencies of a tool are written down.
conditions_does_not_apply_when: The tool has no dependencies.
artifact_contract_output_type: dependency-list
artifact_contract_required_data:
  - the tools it invokes
  - the tools that help beside it
  - the relationship for each
artifact_contract_verified_by: "every listed tool is either invoked or helps beside it, and nothing else is listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ecosystem.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/multi-skill-module/shape.md
status: active
revision: 2
---

# Declare a dependency only where it is used
From the discovery, decide for each installed skill:
required when the new skill invokes it, recommended when it helps beside it, nothing otherwise.
Module-wide needs go in the record, one skill's needs in its own file.
