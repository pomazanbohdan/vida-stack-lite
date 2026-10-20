---
instruction_id: freeze-the-human-owned-intent-in-the-plan
title: Freeze the human-owned intent in the plan
summary: The plan carries the human-owned intent in a block that is read-only for the agent and locked once the human approves it.
capability_tags:
  - plan-implementation
pattern_tags:
  - frozen-intent
conditions_applies_when: A plan document holds the intent the work is built from.
conditions_does_not_apply_when: There is no plan document and the intent lives only in the conversation.
artifact_contract_output_type: frozen-intent-block
artifact_contract_required_data:
  - the human-owned intent block
  - the state that locks it
  - the place an intent gap is recorded instead
artifact_contract_verified_by: the block was not written by the agent after the approval and no intent gap was filled in as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-03-implement.md
status: active
revision: 1
---

# Freeze the human-owned intent in the plan

`<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">`

Content inside `<frozen-after-approval>` in `{plan_file}` is read-only. Do not modify.

Never write an intent gap into the frozen block as an assumption.

If `preserved_intent` is non-empty, replace the `<frozen-after-approval>` block with it before writing.

Set status `ready-for-dev`; everything inside `<frozen-after-approval>` is then locked and only the human can change it.
