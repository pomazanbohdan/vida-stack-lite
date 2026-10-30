---
instruction_id: model-domain-in-structure
title: Model the domain in structure
summary: "Encode the real domain in a data structure instead of scattering it across conditionals; choose the structure at write time, when it is cheap."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: You introduce or rework the types that describe product concepts.
conditions_does_not_apply_when: The code serves only infrastructure and does not model product concepts.
artifact_contract_output_type: domain-model
artifact_contract_required_data:
  - domain vocabulary
  - types
  - invariants
  - usage examples
artifact_contract_verified_by: "the project's type checks and a domain expert review of the vocabulary"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-model-the-domain/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Model the domain in structure
Encode the real domain in a data structure instead of scattering it across conditionals.
A structure that matches the domain makes invalid states unrepresentable and deletes branches.
Choosing it at write time is cheap; recovering it later reads as a refactor and gets deferred.
Reach for a state machine instead of scattered booleans, phases, or lifecycle checks.
Reach for a typed model instead of loose parameters or repeated shape assumptions.
Reach for a map, registry, lookup table, or discriminated union instead of branching spread across files.
Reach for a reducer or command/event model instead of ad hoc state mutations.
Organize a module around one body of domain knowledge, not a sequence such as load, validate, transform, and save; execution order is not ownership.
Use a small module boundary that gathers repeated behavior, ownership, or invariants.
Use a queue, cache, index, graph, tree, or normalized collection where the access pattern calls for it.
When no structure fits, work out what the code must never allow and how the data gets read, then find the structure that encodes exactly that.
Do not force an abstraction.
Prefer boring code if the current shape is already clear, local, and unlikely to grow.
Be skeptical of an abstraction that adds indirection without removing branches, duplicated rules, invalid states, or lifecycle risk.
A new feature that grows an existing if/else chain by one more branch, or a second boolean that must stay in sync with the first, is a sign that you skipped this.
Phase-named modules repeat the same domain rules across steps.
