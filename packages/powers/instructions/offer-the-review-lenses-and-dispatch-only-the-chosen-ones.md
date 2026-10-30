---
instruction_id: offer-the-review-lenses-and-dispatch-only-the-chosen-ones
title: Offer the review lenses and dispatch only the chosen ones
summary: "Reviewers are costly, so the review is opt-in: at finalisation ask whether to validate at all, present the lens menu, and dispatch only the lenses the person picks."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A design is about to be reviewed.
conditions_does_not_apply_when: The review was already requested and the lenses were already chosen.
artifact_contract_output_type: review-dispatch
artifact_contract_required_data:
  - the lens menu
  - the chosen lenses
artifact_contract_verified_by: the menu was presented and only the chosen lenses ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Offer the review lenses and dispatch only the chosen ones
Opt-in, lens-selectable — reviewers are costly (parallel subagents, substantial token spend).
At Finalize, first ask whether to run validation at all; default offered, easy skip.
At Validate intent the user already opted in — skip that question.
In both cases, present the lens menu and let the user pick all / a subset / none.
Always present the lens picks before dispatching.
Only picked lenses dispatch.
Picked lenses dispatch as parallel subagents → each writes `review-{lens}.md`, returns a compact summary.
If any lens ran, run the synthesis pipeline
