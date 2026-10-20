---
instruction_id: stop-when-the-request-left-out-something-the-user-would-notice
title: Stop when the request left out something the user would notice
summary: "When the request is missing something the user would see in the result, the coding stops, the gap is written down and the human is asked instead of a guess."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The work is under way and a gap shows up that the user would notice in the result.
conditions_does_not_apply_when: The gap is a detail the user does not see in the result.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the gap
  - where the gap was written down
  - the question put to the human
artifact_contract_verified_by: "the coding stopped at the gap and nothing was guessed on the user's behalf"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-oneshot.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
status: active
revision: 1
---

# Stop when the request left out something the user would notice

Stop coding if the request left out something the user would notice in the result.

Write the gap in `## Implementation Notes`, then ask the human — do not guess.

Then update `{plan_file}`: add back `## Code Map` (filled in from what you learned while implementing) and `## Open Questions` (one question per gap), set `route: 'full'` and `status: 'draft'`.

Do not ask the human during investigation. When something is unclear, look in the repository, planning artifacts, or history first. Keep looking until you know, or until those sources have nothing more to say. Leave any remaining choice for the next step.

If there are intent gaps, add a `## Open Questions` section with one entry per gap: the choice, the options, and what each option means.

Present every entry as a numbered question with its options and what each option means, and HALT for the human's answers. Write each answer into the `<frozen-after-approval>` block as a decision and delete the entry.
