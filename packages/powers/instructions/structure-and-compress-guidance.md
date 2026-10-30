---
instruction_id: structure-and-compress-guidance
title: Keep guidance short and navigable
summary: "Keep the main file under 500 lines and move heavy reference into one-level-deep files, cutting every token that does not earn its place."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - progressive-disclosure
conditions_applies_when: The guidance or its reference material is getting long.
conditions_does_not_apply_when: The guidance is short and fits on one screen.
artifact_contract_output_type: structured-guidance
artifact_contract_required_data:
  - core guidance
  - extracted references
  - table of contents
  - links
artifact_contract_verified_by: the core guidance remains usable without the references
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep guidance short and navigable
Keep the body under 500 lines for optimal performance.
Split content into separate files when approaching this limit.
The main file serves as an overview that points agents to detailed materials as needed.
Move heavy reference over 100 lines into a separate file.
Keep principles and concepts inline.
Keep code patterns under 50 lines inline.
For reference files longer than 100 lines, include a table of contents at the top.
Keep references one level deep.
All reference files should link directly from the main file.
Don't repeat what is in cross-referenced skills.
Don't explain what is obvious from the command.
Don't include multiple examples of the same pattern.
Use cross-references instead of repeating workflow details.
Compress examples.
One excellent example beats many mediocre ones.
Every token competes with conversation history and other context.
Only add context agents don't already have.
Challenge each piece: does the agent really need this explanation?
Getting-started workflows aim for under 150 words each.
Frequently loaded guidance aims for under 200 words total.
Other guidance aims for under 500 words.
A document is built from two content types: **steps** (the ordered actions the agent performs) and **reference** (definitions, rules, facts consulted on demand). The core decision is where each piece sits on the **information hierarchy**, a ladder ranked by how immediately the agent needs the material: in-file step, in-file reference, disclosed reference. Push too little down and the top bloats; push too much and you hide material the agent actually needs. **Progressive disclosure** is the move down the ladder so the top stays legible. Branching is the cleanest disclosure test: inline what every branch needs, and push behind a pointer what only some branches reach. **Co-location** is the within-file companion: keep a concept's definition, rules, and caveats under one heading rather than scattered. **Sprawl** is the failure mode: a document simply too long, even when every line is live and unique. The cure is the ladder: disclose reference behind pointers, and split by branch or sequence so each path carries only what it needs.

Carve by relevance, not size. The entry is paid on every invocation; a reference only when its branch fires. Carve what only some branches need and keep a routing map in the entry; leave what is too small to repay the indirection. A small skill is one file; a reference exists only when a branch has earned it. The budget is for what one run loads, not for the skill as a whole: a complex workflow is the right size when each branch sits in its own file and loads only when reached, whatever the total comes to. A carved file stands alone, because the entry can drop from context, and references stay one level deep.
Several operating modes get one reference each; one thing to do gets no router.
