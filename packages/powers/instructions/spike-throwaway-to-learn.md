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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/prototyping.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - research
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
