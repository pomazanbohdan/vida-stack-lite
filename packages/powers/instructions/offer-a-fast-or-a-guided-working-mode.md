---
instruction_id: offer-a-fast-or-a-guided-working-mode
title: Offer a fast or a guided working mode
summary: "Offer the choice between a fast drafted path and a guided walkthrough, in the owner’s language, and reach it within two or three turns."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The picture is clear enough to start writing and the remaining gaps are known.
conditions_does_not_apply_when: The input is already rich enough to extract from without asking anything.
artifact_contract_output_type: working-mode-choice
artifact_contract_required_data:
  - the two modes and what each one costs
  - the owner’s choice
  - the entry point the chosen mode starts from
artifact_contract_verified_by: the owner picked the mode and the section order follows from the choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 1
---

# Offer a fast or a guided working mode
Get to working mode fast — two or three turns, not ten.
Users in a hurry must not be held hostage by upstream probing.
Working mode. Offer the choice in the user's language:
Fast path — I batch remaining gaps into one or two consolidated questions, then draft the full PRD with `[ASSUMPTION]` tags where I inferred.
You review and we iterate.
The initial quality depends on how much you gave me upfront.
Coaching path — we walk PM-thinking sections together.
Once chosen, I ask which entry point fits: Vision + Features (capability-first — for enterprise, dev products, internal tools, anyone who thinks in features), Journey-led (user-first — for consumer, UX-heavy, multi-stakeholder products; journeys with named protagonists carry persona context inline, no standalone persona section), or *let me suggest* based on what I heard.
The chosen entry sets the section order.
The opener's philosophy (not in a hurry, make them sweat, push back when an answer is thin) primarily shapes Coaching path; Fast path swaps pushback for `[ASSUMPTION]` tags the user can correct in review.
When input is rich, extract directly — no elicitation.
When input is sparse, choose: express (best-effort distill, every gap becomes an `open_questions[]` entry) or guided (walk the five fields with the user one at a time).
Headless defaults to express and logs the choice. Interactive asks.
