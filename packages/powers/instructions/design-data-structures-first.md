---
instruction_id: design-data-structures-first
title: Sketch types and boundaries before code
summary: "Settle types, function signatures and module boundaries before implementation, then fill in code against the chosen sketch."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "The work is non-trivial, and jumping to code would lock in the wrong shape."
conditions_does_not_apply_when: "Most changes need none of it; a small, finished change you are unsure about needs adversarial review alone."
artifact_contract_output_type: data-structure-design
artifact_contract_required_data:
  - type sketch
  - function signatures
  - module boundaries
  - interface depth comparison
artifact_contract_verified_by: "the project's type checks and review against the chosen sketch"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/04-design.md
status: active
revision: 1
---

# Sketch types and boundaries before code
Sketch types, function signatures, class shapes, and module boundaries with `not implemented` bodies and pseudocode.
Synthesize across multiple model perspectives, then fill in code against the chosen sketch.
Build a real mental model of every system the new code touches.
Produce the architectural explanation the understanding pass prescribes.
If the design redefines ownership or layering, also establish why the existing shape is what it is, so the rationale becomes a constraint, not a guess.
Skip the grounding phase only when the work is genuinely greenfield with no surrounding system to integrate.
Design it twice.
Require at least two structurally distinct candidates before synthesis, even when the first looks sufficient.
Whole-shape alternatives, not point fixes inside one shape.
Screen every candidate against the design red flags before synthesis.
Assume the next contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles.
Prefer the design where a change that looks right from one file is right for the whole repo.
Compare viable candidates on interface depth.
Prefer the design that hides more complexity behind a smaller, simpler public surface.
A rich interface can keep call chains short by concentrating capability instead of scattering it across layers.
Replace `not implemented` bodies with code, pseudocode with logic.
The synthesized sketch is the contract.
Deviations from it are signal to surface, not friction to absorb silently.
If a function needs a parameter the sketch didn't anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching.
One file with new types and signatures for small changes.
Module map plus type definitions for larger work.
