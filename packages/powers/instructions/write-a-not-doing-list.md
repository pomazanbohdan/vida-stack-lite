---
instruction_id: write-a-not-doing-list
title: Write a not-doing list
summary: Name what is deliberately not being done and why; the trade-offs are the most valuable part of the plan.
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A direction is chosen and its scope has to be stated.
conditions_does_not_apply_when: "Nothing has been chosen yet, so there is nothing to rule out."
artifact_contract_output_type: not-doing-list
artifact_contract_required_data:
  - the things not being done
  - the reason for each
artifact_contract_verified_by: "every entry names a specific thing and a reason, not a general intention"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/examples.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
---

# Write a not-doing list

**The "Not Doing" list is arguably the most valuable part.** Focus is about saying no to good ideas. Make the trade-offs explicit.

The "Not Doing" list does real work. It's specific and reasoned. Each item is something you might *want* to do but shouldn't yet.

Say no to 1,000 things. Focus beats breadth.

**The 'Not Doing' list is mandatory.** Explicitly name what you're cutting and why. This prevents scope creep and forces honest prioritization.

Non-goals are explicit. At least one. Absence means downstream skills fill the vacuum.
What this product is *not* and what it will *not* do in v1. Does outsized work for downstream readers and workflows — prevents the "let me also add this nearby thing" failure mode at every level (epic, ticket, code).
Inline `[NON-GOAL for MVP]` callouts within Features cover deferred items within features; this section captures the broader "we are not building X / we are not becoming Y" statements.
Keep this tight — boundary document, not a feature list.
