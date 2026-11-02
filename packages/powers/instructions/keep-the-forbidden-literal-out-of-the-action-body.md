---
instruction_id: keep-the-forbidden-literal-out-of-the-action-body
title: Keep the forbidden literal out of the action body
summary: "When the verification forbids a literal, that literal does not appear verbatim in the action body; the comment is rephrased by concept."
capability_tags:
  - review-code
pattern_tags:
  - testable-criteria
conditions_applies_when: A verification block forbids a literal with a negative grep.
conditions_does_not_apply_when: The literal must appear in the plan body for another reason.
artifact_contract_output_type: plan-literal-discipline
artifact_contract_required_data:
  - the forbidden literal
  - the action body
  - the rephrased comment
artifact_contract_verified_by: the forbidden literal does not appear verbatim in the action body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the forbidden literal out of the action body
When an `<acceptance_criteria>` or `<verify>` block uses a **negative grep** — `grep -c 'LITERAL' file == 0`, meaning "this literal must NOT appear in the file" — that same `LITERAL` must not appear verbatim anywhere in an `<action>` body
Verbatim code blocks, JSDoc samples, head-comment references, and "what NOT to do" illustrations get echoed into the file the executor writes, so the executor's commit-time gate fails on the *comment text*, not on a real code regression
One marker per literal. The marker exempts only the exact literal it names
