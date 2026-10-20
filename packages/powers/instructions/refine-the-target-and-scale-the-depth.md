---
instruction_id: refine-the-target-and-scale-the-depth
title: Refine the target and scale the depth
summary: "The target is the most recent output unless something else is pointed at, and the depth of the refinement is scaled to it; each pass works on the current version."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A piece of work is to be deepened against a chosen critique.
conditions_does_not_apply_when: The target is named explicitly and is not the last output.
artifact_contract_output_type: refined-target
artifact_contract_required_data:
  - the target
  - the depth the refinement ran at
  - the refined version
artifact_contract_verified_by: the refinement was applied to the current version and sized to the target
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 1
---

# Refine the target and scale the depth
The target is the most recent output in the conversation — a section, plan, draft, or decision — unless the caller or user points at something else.
Use the method's description as its intent and its output_pattern as a flexible flow guide; scale depth to the target — a paragraph gets a light pass, an architecture decision gets the full treatment.
Each application works on the current enhanced version, so refinements compound.
