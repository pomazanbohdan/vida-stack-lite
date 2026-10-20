---
instruction_id: prototype-competing-designs
title: Prototype competing designs
summary: "Build several structurally different variants in throwaway code, compare them on the same cases, and choose before the real build."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Several ways to solve the task exist and the cost of a wrong choice is significant.
conditions_does_not_apply_when: "The decision is obvious, or the variants differ only in style."
artifact_contract_output_type: design-comparison
artifact_contract_required_data:
  - criterion
  - variants
  - same cases
  - comparison
  - choice
artifact_contract_verified_by: each prototype exercised on the same input
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/arena/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-exhaust-the-design-space/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/prototype.md
status: active
revision: 1
---

# Prototype competing designs
You own the design decision, not the code.
The prototype is a throwaway instrument; the real build follows.
Scope the decision the prototype exists to make: which layout, which interaction, which density, or for an empirical fork which behavior, timing, or approach.
No decision means no prototype.
Gather references when the design space is open.
Search for prior art, summarize a moodboard of themes, palettes, and layouts, and let the user pick directions before building.
Build throwaway in an isolated scratch directory, separate from production source.
For a visual decision, use vanilla HTML/CSS/JS or the lightest stack that renders the idea, with CDN dependencies and a dev server with hot reload.
For a behavioral or timing decision, use the smallest script that exercises the question.
No production framework, no tests, no abstractions.
When comparing alternatives, build them behind one switcher, each variant labeled.
Verify on the matching surface.
For a visual decision, screenshot each variant and drive the interaction.
For a behavioral or timing decision, observe the thing you are deciding by logging the timing, printing the output, or watching the render.
The observation is the test here, not an assertion.
Give every candidate the same prompt, so the prompt is the contract.
Derive a rubric of three to six concrete gradeable criteria for what success looks like on this task.
Read every candidate output end to end before picking.
Score each against the rubric criterion by criterion, not on holistic feel.
Pick the base a future maintainer can extend most easily without breaking invariants.
When two feel tied, prefer the cleaner boundary or smaller API.
Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate.
Fold each graft in by hand so the result stays coherent under one mental model.
Do not paste mechanically.
Present alternatives, tradeoffs, and a recommendation.
The output is the decision plus the throwaway artifact, not shippable code.
