---
instruction_id: separate-acceptance-criteria-from-the-standing-bar
title: Separate acceptance criteria from the standing bar
summary: "Acceptance criteria say whether the right thing was built; the standing bar says whether it is finished, and both must hold."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: Work is being called done and the task had its own acceptance criteria.
conditions_does_not_apply_when: The work has no acceptance criteria of its own.
artifact_contract_output_type: two-gate-check
artifact_contract_required_data:
  - the acceptance criteria and their state
  - the standing bar and its state
  - which of the two is missing
artifact_contract_verified_by: both gates are reported separately and both are satisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/definition-of-done.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate acceptance criteria from the standing bar
A standing, project-wide bar that every change must clear before it counts as done.
Unlike acceptance criteria, which vary per task and answer "did we build the right thing?", the Definition of Done is the same every time and answers "is this finished to our standard?".
| Scope | Specific to one task or spec | Applies to every increment |
| Changes | Different for each item | Fixed and reused |
| Answers | "Did we build *this thing*?" | "Is it *ready*?" |
| Owner | Defined when planning the task | Defined once for the project |
| Example | "User can reset password via email link" | "Tests pass, no regressions, docs updated" |
The two are complementary. A task is done only when its acceptance criteria are met and the standing Definition of Done is satisfied. Skipping either leaves work that looks finished but is not.
Tailor the list to the project once, then reuse it unchanged. A Definition of Done that is renegotiated every sprint is not a Definition of Done.
A different bar applied depending on deadline pressure.
Acceptance criteria treated as the whole bar, with no standing quality floor.
