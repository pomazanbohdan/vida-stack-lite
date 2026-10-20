---
instruction_id: offer-a-trigger-eval-with-near-misses
title: Offer a trigger eval with near misses
summary: "A trigger eval is offered once, its cases are written from the discovery, and a doubt about the trigger is answered by an eval rather than by a rewrite."
capability_tags:
  - harden-validation
pattern_tags:
  - verification-before-completion
  - code-review
conditions_applies_when: A description decides whether a skill is loaded.
conditions_does_not_apply_when: The skill is only ever invoked by its name.
artifact_contract_output_type: trigger-eval
artifact_contract_required_data:
  - the queries that should fire
  - the near misses that should not
  - the eval run
artifact_contract_verified_by: the eval ran and its failures changed the description
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ship.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-trigger.md
status: active
revision: 1
---

# Offer a trigger eval with near misses
Offer it once; run it on a yes.
Write it from the discovery: 8 to 10 queries that should fire, varied in wording and buried in larger requests, and 8 to 10 near misses that share vocabulary but should not.
A sibling skill shares its vocabulary and no trigger eval has tested the boundary:
- Minor
- recommend one with near misses, and a `Not for` naming the sibling only if it fails
Doubt about any of the above: recommend a trigger eval, not a rewrite by opinion.
