---
instruction_id: structure-and-compress-guidance
title: Keep guidance short and navigable
summary: "Keep the main file under 500 lines and move heavy reference into one-level-deep files, cutting every token that does not earn its place."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
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
status: active
revision: 1
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
