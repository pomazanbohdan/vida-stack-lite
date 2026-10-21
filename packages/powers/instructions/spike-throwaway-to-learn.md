---
instruction_id: spike-throwaway-to-learn
title: "Spike to learn, then throw the spike away"
summary: "Offer a quick throwaway build when learning by doing is cheapest, keep it untested and unpolished, and bring only the lesson back."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "Uncertainty concerns behavior, feasibility, or the look of the result."
conditions_does_not_apply_when: The question can be closed by discussion or existing material.
artifact_contract_output_type: throwaway-spike
artifact_contract_required_data:
  - prototype question
  - prototype boundary
  - knowledge gained
artifact_contract_verified_by: the spike answers the stated question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/prototyping.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 3
---

# Spike to learn, then throw the spike away
Agentic work is waterfall.
It is very, very fast.
A quick throwaway build is often the cheapest way to learn what they want.
A quick throwaway build is also the cheapest way to learn whether something works.
Offer one when it would help.
When they just want to spike, get out of the way.
Spikes get no tests or minimal ones.
Spikes aren't bulletproof.
Spikes skip the plan, implementation, and review process.
Bring what the spike taught you back into the conversation.
Two exceptions: a spike they said yes to may be built; it stays labeled throwaway.
Keeping what it produced is a new request that comes back through this gate.
Use it for throwaway prototypes they can click.
If it grows mid-task, stop, say so, and step up a size.

Ask the user to decide this on purpose.
The outcome to avoid is a prototype that becomes the real product with nobody deciding it should, and with no spec.
prototype code written to learn fast seldom meets the codebase's standards
Never declare VALIDATED after a single happy-path test.
Document the investigation trail, not just the conclusion.
Do not rush to a verdict. A spike that says "VALIDATED — it works" with no nuance is almost always incomplete.
