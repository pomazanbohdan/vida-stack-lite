---
instruction_id: derive-the-architecture-delta-from-the-range
title: Derive the architecture delta from the range
summary: "The dependency structure is measured before and after the range and the graphs are compared, so the new cross-cutting dependencies, the layering violations and the cycles are seen."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The architecture of a body of work is read back.
conditions_does_not_apply_when: The change did not move anything between the modules.
artifact_contract_output_type: architecture-delta
artifact_contract_required_data:
  - the graph before
  - the graph after
  - "the new dependencies, violations and cycles"
artifact_contract_verified_by: the delta is derived from a measured graph and every new structure is named with the file it appears in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 1
---

# Derive the architecture delta from the range
**Architecture delta** — how the dependency structure changed across the epic.
Where a language-native dependency tool exists (dependency-cruiser, madge, pydeps, and the like), run it before and after the range and diff the graphs; otherwise derive the module/import graph from the changed files.
Look for new cross-cutting dependencies, layering violations, and cycles introduced — structure the code's own conventions would forbid but no single ticket tripped.
