---
instruction_id: annotate-the-code-map-with-what-to-reuse-and-what-not-to-change
title: Annotate the code map with what to reuse and what not to change
summary: "Every path in the map carries its role, so the implementer works from the map instead of searching the codebase blindly."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan maps the files the change touches.
conditions_does_not_apply_when: The change touches one file with no discovery needed.
artifact_contract_output_type: code-map
artifact_contract_required_data:
  - the paths
  - the role of each path
  - what to reuse
  - what not to change
artifact_contract_verified_by: each path in the map carries an annotation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Annotate the code map with what to reuse and what not to change
Agent-populated during planning. Annotated paths prevent blind codebase searching.
Decide which findings actually matter for execution — the specific files, symbols/lines, reuse points, and read-only constraints — and carry those forward for the code map.
