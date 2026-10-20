---
instruction_id: design-from-caller-usage
title: "Derive the interface from the caller's usage"
summary: "Write the caller's usage first and derive the type sketch from it, so the API is described to a hypothetical user and the implementation works back from there."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A package or API that other code will use is being designed.
conditions_does_not_apply_when: The interface is already fixed by an external contract and cannot change.
artifact_contract_output_type: caller-first-interface
artifact_contract_required_data:
  - usage sketch
  - types
  - signatures
  - module map
artifact_contract_verified_by: "the project's type checks and a test that uses the proposed call"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/04-design.md
status: active
revision: 1
---

# Derive the interface from the caller's usage
For a package or API that other code will use, start with the doc a user would read.
Write the caller's usage first and derive the type sketch from it.
Writing the tutorial first forces the caller's view.
You describe the API to a hypothetical user and work back to the implementation.
The doc also becomes a concrete target the agent checks its own work against.
Ground the design first over the code it touches, before writing the usage sketch.
Naming a file isn't grounding.
Keep a tutorial a tutorial instead of drifting into reference and explanation at once.
The caller's usage is written first in each design attempt, followed by types, signatures, and a module map.
Name the writing standard when the doc itself matters.
Establish why the current shape exists when the design moves ownership or layers.
Write the plan after the design settles, not before.
If implementation shows types that only compile with forced casts, treat that as proof the design is wrong.
Fill in code against the chosen sketch.
