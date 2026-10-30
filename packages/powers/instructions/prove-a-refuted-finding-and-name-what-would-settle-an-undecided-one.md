---
instruction_id: prove-a-refuted-finding-and-name-what-would-settle-an-undecided-one
title: Prove a refuted finding and name what would settle an undecided one
summary: A finding whose bad outcome does not happen carries what disproves it; a finding you cannot decide carries what would settle it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The verification of a finding ended in \"the bad outcome does not happen\" or in \"you could not tell\"."
conditions_does_not_apply_when: The finding is confirmed and graded.
artifact_contract_output_type: refuted-and-undecided-findings
artifact_contract_required_data:
  - the refutation
  - what would settle the question
artifact_contract_verified_by: every refuted finding names what disproves it and every undecided one names what would settle it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prove a refuted finding and name what would settle an undecided one
`false` -- you checked, and the bad outcome does not happen at the cited location. Write what disproves this specific claim.
A true fact about nearby code that does not disprove the claim does not count.
`maybe-false` -- you could not tell whether the bad outcome happens. Write what you would need to check to find out.
Use this only when the diff and surrounding code leave the question open; when they are enough to decide, pick `Critical`, `Important`, `Minor`, or `false`.
