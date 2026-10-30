---
instruction_id: keep-the-failure-literal-out-of-the-action-text
title: Keep the failure literal out of the action text
summary: "A literal that a negative grep forbids must not appear verbatim in the task action, because the comment gets echoed into the file and the gate then fires on the comment text instead of on a real regression."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A task carries a negative grep and the same literal would appear in the action body.
conditions_does_not_apply_when: No negative grep forbids the literal.
artifact_contract_output_type: rephrased-action
artifact_contract_required_data:
  - the forbidden literal
  - the rephrased action
  - the marker when the literal must stay verbatim
artifact_contract_verified_by: the forbidden literal appears nowhere in the action body unless a marker names it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the failure literal out of the action text
When an `<acceptance_criteria>` or `<verify>` block uses a **negative grep** - `grep -c 'LITERAL' file == 0`, meaning "this literal must NOT appear in the file" - that same `LITERAL` must not appear verbatim anywhere in an `<action>` body. Verbatim code blocks, JSDoc samples, head-comment references, and "what NOT to do" illustrations get echoed into the file the executor writes, so the executor's commit-time gate fails on the *comment text*, not on a real code regression. The work is correct; the gate output is semantically wrong; the executor wastes cycles and learns to distrust the gate.
**The gate:** plan creation FAILS (error, `valid: false`) when a confidently-extracted (quoted) negative-grep literal also appears in an `<action>` block. When the grep literal is unquoted and cannot be extracted unambiguously, the gate WARNS instead of failing (so you still get the plan, with the risk surfaced).
Rephrase the comment by concept.
`Add the share-link query param. Do NOT reintroduce the legacy referrer hack.`
When the literal MUST appear in the plan body verbatim - e.g. the plan documents the test file that exercises the gate itself, or the literal is part of the verification command's own grep regex - add a marker on its own line so the gate skips that literal
One marker per literal. The marker exempts only the exact literal it names.
