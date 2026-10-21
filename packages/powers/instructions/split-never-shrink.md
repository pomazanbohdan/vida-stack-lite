---
instruction_id: split-never-shrink
title: "Split, never shrink"
summary: "A reduced scope — \"for now\", placeholder, simplified, wired later — is a second item, not a smaller first one, and the listed words are prohibited in a task action."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: An item is proposed at a reduced scope.
conditions_does_not_apply_when: The item is proposed at its full scope.
artifact_contract_output_type: split-decision
artifact_contract_required_data:
  - the full scope
  - the second item that carries the reduced part
  - the prohibited wording that was used
artifact_contract_verified_by: the reduced part is a second item and not a smaller first one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
---

# Split, never shrink
Split, never shrink: "for now", "placeholder", "simplified", "wired later" is a second story.

**Prohibited language in task actions:**
- "v1", "v2", "simplified version", "static for now", "hardcoded for now"
- "future enhancement", "placeholder", "basic version", "minimal implementation"
- "will be wired later", "dynamic in future phase", "skip for now"

If the phase is too complex, recommend a phase split instead of silently reducing scope.
