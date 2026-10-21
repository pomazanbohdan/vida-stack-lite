---
instruction_id: propose-the-next-exploration-from-the-landscape
title: Propose the next exploration from the landscape
summary: "The next candidate work is derived from what the existing explorations already proved: the gaps between them, and the surfaces nobody has explored yet."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: A set of explorations already exists and the next one has to be chosen.
conditions_does_not_apply_when: The next piece of work is already decided.
artifact_contract_output_type: exploration-proposals
artifact_contract_required_data:
  - the consistency gaps found
  - the unexplored surfaces
  - the design questions each proposal answers
artifact_contract_verified_by: every proposal names a concrete gap or unexplored surface and carries a design question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch.md
status: active
revision: 1
---

# Propose the next exploration from the landscape
**Visual consistency gaps:** Two sketches made independent design choices that haven't been tested together.
**State combinations:** Individual states validated but not seen in sequence.
**Responsive gaps:** Validated at one viewport but the real app needs multiple.
**Theme coherence:** Individual components look good but haven't been composed into a full-page view.
**Unsketched screens:** UI surfaces assumed but unexplored.
**Interaction patterns:** Static layouts validated but transitions, loading, drag-and-drop need feeling.
**Edge case UI:** 0 items, 1000 items, errors, slow connections.
**Polish passes:** Typography, spacing, micro-interactions, empty states.
If consistency risks exist, present them as concrete proposed sketches with names and design questions. If no meaningful gaps, say so and skip.
