---
instruction_id: supply-a-stack-table
title: Supply a stack table
summary: "Name every language, framework, key dependency, platform and chain that is pinned, with the version and nothing else."
capability_tags:
  - design-structure
pattern_tags:
  - pinned-stack-table
conditions_applies_when: A contract names the technologies the work is built on.
conditions_does_not_apply_when: The work uses no pinned technology.
artifact_contract_output_type: stack-table
artifact_contract_required_data:
  - the pinned technologies
  - the versions
  - the verification date
artifact_contract_verified_by: every pinned technology has a version and the reason for it is not in the table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 1
---

# Supply a stack table
One row per language, framework, key dependency, platform, or chain that's pinned.
SEED — verified current at authoring; the code owns this once it exists.
Name + version only; the why lives in the memlog.
