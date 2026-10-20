---
instruction_id: choose-user-experience-over-implementation
title: Choose user experience over implementation convenience
summary: "When implementation convenience conflicts with user delight, choose delight and ship fewer polished features over more rough ones."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Product, UX, or feature-scope tradeoffs come up."
conditions_does_not_apply_when: The change is purely internal and is not observed by a user.
artifact_contract_output_type: user-path
artifact_contract_required_data:
  - user goal
  - steps
  - steps removed
  - tradeoffs
artifact_contract_verified_by: the path walked through in the running product
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-experience-first/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
---

# Choose user experience over implementation convenience
When implementation convenience conflicts with user delight, choose delight.
Every feature, control, and option must be justified.
Ship less, ship better.
A polished experience with three features beats a rough one with ten.
Prototype before committing: design decisions are cheaper in throwaway HTML than in production code.
Get the details right: transitions, alignment, spacing, feedback, error states.
Tighten the core loop: every feature should serve the central workflow or get out of the way.
The user is whoever consumes the work.
For a UI that is the end user.
For a library or an internal API it is the colleague who imports it.
The engineer who maintains the code next is a user too.
Weigh their experience the same way, and explain impact from their perspective.
Foundations should serve the experience.
Foundational thinking governs the sequence of work; this principle governs the target.

Focus on the experience and the outcome, not the implementation.
