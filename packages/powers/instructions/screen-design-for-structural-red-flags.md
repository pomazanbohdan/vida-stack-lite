---
instruction_id: screen-design-for-structural-red-flags
title: Screen a design for structural red flags
summary: "Look for the shapes that make maintenance expensive, and name a concrete harm scenario for each before the design is accepted."
capability_tags:
  - audit-codebase
pattern_tags:
  - structural-design
conditions_applies_when: A design or module structure needs assessment before implementation or right after it.
conditions_does_not_apply_when: "The request is a general code-quality judgment, not the structure of how parts interact."
artifact_contract_output_type: structural-risk-list
artifact_contract_required_data:
  - flag
  - harm scenario
  - smallest change
  - what to check after
artifact_contract_verified_by: a reviewer walkthrough over a real call path in the code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/design-red-flags.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Screen a design for structural red flags
Screen every candidate design before synthesis. A red flag is a reason to revise or reject the shape.
Shallow module: a shallow module exposes a large interface while hiding little complexity. Judge depth by the capability and policy hidden behind the public surface relative to the size of that surface.
Do not confuse a deep module with a deep call chain. A deep call chain scatters understanding across layers. A deep module concentrates capability behind one interface.
Look for callers coordinating several methods to complete one operation, public options that expose internal stages or implementation choices, and an interface that does not save the caller from learning the implementation.
Information leakage: a representation, policy, or protocol detail appears in more than one place, so changing it requires coordinated edits.
Public re-exports of transport or wire types are leakage. Parse external data into domain types behind the interface. Keep storage schemas, framework objects, and protocol details private.
Temporal decomposition: modules grouped by execution order instead of the knowledge they own. Separate load, validate, transform, and save stages often repeat one representation and its invariants across several boundaries.
Group code around domain knowledge and ownership. Methods that run at different times can still belong to one module when they protect the same decisions.
Pass-through method: a method that forwards the same arguments to another method with the same shape. It adds a layer without hiding complexity. Remove it, or keep it only when it adds policy, adaptation, or a distinct abstraction.
Split ownership: more than one module writes the same state or keeps its own copy of it. An agent that edits one writer cannot see the others, so their rules diverge. Give each piece of state one owner.
Two ways to do one task: keep one way, move callers off the others, and delete them in the same change.
Importable internals: a caller can import a module's internals and takes the shortest path that compiles. Make internals unreachable from outside, so an import from outside fails the build.
Hand-synced list: two or more places list the same items, and adding an item means editing every list. Keep one list and derive the others from it. If a list cannot be derived, make the build fail when the lists disagree.
For each flag, name the concrete harm scenario, the smallest change that removes it, and what to check after the change.
