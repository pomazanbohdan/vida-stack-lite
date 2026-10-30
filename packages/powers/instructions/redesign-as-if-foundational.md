---
instruction_id: redesign-as-if-foundational
title: Redesign as if the requirement were foundational
summary: "When integrating a change, redesign as if the new requirement had been a foundational assumption from the start, then deliver the redesign incrementally."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A new requirement has to be integrated into an existing design.
conditions_does_not_apply_when: The change is a local fix that does not alter the design.
artifact_contract_output_type: target-design
artifact_contract_required_data:
  - target design
  - propagation paths
  - first step
  - checks
artifact_contract_verified_by: "the first step validated against the project's checks"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-redesign-from-first-principles/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-foundational-thinking/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Redesign as if the requirement were foundational
When integrating a change, do not bolt it onto the existing design.
Redesign as if the requirement had been a foundational assumption from the start.
Read all affected files and understand the current design.
Ask: if we were writing this from scratch with this new requirement, what would we build?
Propagate the change through every reference: types, docs, examples, rationale sections.
Think about the whole redesign, then deliver it incrementally.
Structural decisions protect option value; code-level decisions protect simplicity.
Get the data shape right before writing logic.
Define core types early, trace every access pattern, and choose structures that match the dominant paths.
DRY the structure, not every line.
Three similar statements still beat a premature abstraction.
Prefer explicit over clever.
Before sharing state between actors, ask what happens if another actor modifies this concurrently; if not "nothing", isolate.
If something helps every later phase, do it first.
Setup before features, tests before fixes, and keep commits small and single-purpose.
Each increment should land a coherent abstraction or deepen one that exists.
Do not spread a new capability across callers as special-case coordination.
Subtraction comes before scaffolding: remove dead code first, then lay foundations.
