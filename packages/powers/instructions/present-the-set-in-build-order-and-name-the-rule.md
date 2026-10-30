---
instruction_id: present-the-set-in-build-order-and-name-the-rule
title: Present the set in build order and name the rule
summary: "Show the cut in build order, say in one sentence which rule cut it, and name the tracer path, the touch points, the shared decisions, what can run in parallel and what is deferred."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A cut of the work has to be shown to the user for approval.
conditions_does_not_apply_when: The user asked for the items one by one as they are written.
artifact_contract_output_type: proposed-set
artifact_contract_required_data:
  - the order
  - the rule that cut it
  - the tracer path
  - the touch points
  - the shared decisions
  - what can run in parallel
  - the deferred scope
artifact_contract_verified_by: "the set is in build order, the rule that cut it is named, and the tracer path, touch points and shared decisions are listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Present the set in build order and name the rule
Draft the set, run the tree check in `validate.md` on the draft, then present it in recommended build order and say in one sentence which rule cut it. For each epic: title, one to three sentences of what is true when it is done, the parent ids it owns, its boundary, and what it needs from the epics before it.
With the set, present:
the tracer path across epics, when the first demo cuts through several;
every touch point, with the epic that owns it;
the decisions more than one epic must adopt: a contract, a message or data format, a shared value list. One repo or one unit has none.
With the draft, name the tracer bullet, what can run in parallel, and any deferred scope. With the approval question, ask once whether the user wants to change a description or add a note or reference to any entry.
