---
instruction_id: offer-named-critique-methods-and-propose-the-changes
title: Offer named critique methods and propose the changes
summary: "Name the reasoning method instead of asking for a retry, apply it to the recent output, and show the proposed changes for the human to accept or discard."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A piece of output seems fine but is suspected to be shallow, or the content is high-stakes."
conditions_does_not_apply_when: The work has not been produced yet.
artifact_contract_output_type: elicitation-offer
artifact_contract_required_data:
  - the named method
  - the improvements it produced
  - the accept-or-discard step
artifact_contract_verified_by: the method is named and the human accepts or discards the proposed changes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/reference/skills-and-agents.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The source covers review methods for varied outputs but does not anchor them to one supported classification domain.
---

# Offer named critique methods and propose the changes
Instead of "try again," you pick a named reasoning method and the model re-examines its own output through that lens.
A named method forces a particular angle of attack and surfaces what a generic retry misses.
It suggests five methods that fit the target (the most recent output, unless you point it elsewhere)
You pick one or more, or reshuffle for different options
It applies the method and shows the proposed improvements
You accept or discard, then repeat or continue
Pre-mortem analysis is a good first pick for any spec or plan.
