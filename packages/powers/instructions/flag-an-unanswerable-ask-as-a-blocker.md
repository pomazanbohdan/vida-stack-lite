---
instruction_id: flag-an-unanswerable-ask-as-a-blocker
title: Flag an unanswerable ask as a blocker
summary: "Do not interview without a live user; in a non-interactive run, report the underspecified ask as a blocker instead of guessing, and never resolve the intent by guessing."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The work runs without a live, responsive user to answer questions."
conditions_does_not_apply_when: A live user is present and can answer the questions.
artifact_contract_output_type: blocker-report
artifact_contract_required_data:
  - the underspecified ask
  - the non-interactive context
artifact_contract_verified_by: "the ask is reported as a blocker and nothing was guessed on the user's behalf"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Flag an unanswerable ask as a blocker

This needs a live, responsive user. **Do not invoke in non-interactive contexts** like CI pipelines, scheduled runs, or autonomous loops. If you are in one of those and the ask is underspecified, flag that as a blocker for the user instead of guessing.

Resolve intent from the invocation prompt and loaded artifacts. Do not fantasize or leave open questions.
If the intent cannot be resolved, stop with status `blocked` and the unresolved questions as the blocking condition.
