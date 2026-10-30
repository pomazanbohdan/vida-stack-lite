---
instruction_id: generate-a-bounded-set-of-variations
title: Generate a bounded set of variations
summary: "Generate five to eight variations with named lenses, each with the reason it exists, and push past what the user initially asked for."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The idea has been sharpened and the space of possible directions is to be opened up.
conditions_does_not_apply_when: A direction is already chosen and only needs to be turned into a plan.
artifact_contract_output_type: idea-variations
artifact_contract_required_data:
  - "5 to 8 variations"
  - the lens that produced each variation
  - the reason each variation exists
artifact_contract_verified_by: "every variation names the lens that produced it and the set holds 5 to 8 entries, not 20"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Generate a bounded set of variations

Generate 5-8 idea variations using these lenses:

- **Inversion:** "What if we did the opposite?"
- **Constraint removal:** "What if budget/time/tech weren't factors?"
- **Audience shift:** "What if this were for [different user]?"
- **Combination:** "What if we merged this with [adjacent idea]?"
- **Simplification:** "What's the version that's 10x simpler?"
- **10x version:** "What would this look like at massive scale?"
- **Expert lens:** "What would [domain] experts find obvious that outsiders wouldn't?"

Push beyond what the user initially asked for. Create products people don't know they need yet.

**Don't generate 20+ ideas.** Quality over quantity. 5-8 well-considered variations beat 20 shallow ones.

**Don't just list ideas — tell a story.** Each variation should have a reason it exists, not just be a bullet point.

Variations have reasons. Each one explains *why* it exists (what lens generated it), not just *what* it is. The label (Inversion, Simplification, etc.) teaches the user to think this way themselves.
