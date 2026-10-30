---
instruction_id: set-the-review-mode-from-what-was-given
title: Set the review mode from what was given
summary: "Decide full or no-plan from the plan you were handed, ask when nothing says, and load the context documents the plan names."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review target is known and the review needs a plan to compare the change against.
conditions_does_not_apply_when: The review runs without a plan and nothing in the request asks for one.
artifact_contract_output_type: review-mode
artifact_contract_required_data:
  - the review mode
  - the plan file
  - the context documents loaded
artifact_contract_verified_by: "the mode and the plan file are stated, and every context document the plan names is loaded or reported missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Set the review mode from what was given
The request or conversation explicitly says there is no plan → `review_mode` = `no-plan`, `plan_file` = `''`. Do not ask.
`plan_file` is set → verify it is readable; `review_mode` = `full`.
Otherwise, ask for a plan file path, or to continue without one, and set `plan_file` and `review_mode` accordingly. Do not assume no-plan just because none was given.
If `review_mode` = `full` and `{plan_file}`'s frontmatter has a `context` list, load each referenced doc and warn about any that cannot be found.
