---
instruction_id: separate-a-painkiller-from-a-vitamin
title: Separate a painkiller from a vitamin
summary: "Judge the user value by whether the problem is acute and frequent, not by how good the result sounds."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has to be judged on the value it delivers to its user.
conditions_does_not_apply_when: The user value was already established with named people and a known frequency.
artifact_contract_output_type: value-assessment
artifact_contract_required_data:
  - the painkiller or vitamin verdict
  - the named people who have the problem
  - what they do today instead
  - how often the problem occurs
artifact_contract_verified_by: three specific people with the problem can be named and the verdict rests on frequency and switching
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - research
---

# Separate a painkiller from a vitamin

The most important dimension. If the value isn't clear, nothing else matters.

**Painkiller vs. Vitamin:**

- **Painkiller:** Solves an acute, frequent problem. Users will actively seek this out. They'll switch from their current solution. Signs: people describe the problem with emotion, they've built workarounds, they'll pay for a solution.
- **Vitamin:** Nice to have. Makes something marginally better. Users won't go out of their way. Signs: people nod politely, say "that's cool," then don't change behavior.

**Questions to ask:**

- Can you name 3 specific people who have this problem right now?
- What are they doing today instead? (The real competitor is always the current workaround.)
- Would they switch from their current approach? What would make them switch?
- How often do they encounter this problem? (Daily problems > monthly problems)
- Is this a "pull" problem (users are asking for this) or a "push" problem (you think they should want this)?

**Red flags:**

- "Everyone could use this" — if you can't name a specific user, the value isn't clear
- "It's like X but better" — marginal improvements rarely drive adoption
- The problem is real but rare — high intensity but low frequency rarely justifies a product
