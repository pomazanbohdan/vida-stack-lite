---
instruction_id: never-fabricate-research
title: Never fabricate research
summary: "When the tool that produces the evidence is unavailable, say so and offer the other route; never invent the material."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The evidence has to come from a source that cannot be reached right now.
conditions_does_not_apply_when: The material is already in hand.
artifact_contract_output_type: unavailable-source-report
artifact_contract_required_data:
  - what was unavailable
  - the route offered instead
artifact_contract_verified_by: the gap is stated and no material was invented in its place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
status: active
revision: 1
---

# Never fabricate research
Web access is required for Run. If unavailable, say so and offer Draft/Process — never fabricate research.
Halt `blocked` only when topic or target folder cannot be inferred, or a codebase ask has no bounded question set.
