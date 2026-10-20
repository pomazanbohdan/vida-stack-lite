---
instruction_id: judge-multi-goal-by-independent-shippable-deliverables
title: Judge a multi-goal intent by independent shippable deliverables
summary: "Multi-goal means two or more top-level independent shippable deliverables; surface the goals, recommend one, and let the human split or keep them."
capability_tags:
  - clarify-requirements
pattern_tags:
  - code-minimization
conditions_applies_when: An incoming intent could carry more than one deliverable.
conditions_does_not_apply_when: The intent names one deliverable that happens to span several layers.
artifact_contract_output_type: goal-split-decision
artifact_contract_required_data:
  - the detected goals
  - why each qualifies as independently shippable
  - the coupling risk of a split
  - the recommended first goal
  - the decision of the human
artifact_contract_verified_by: the goals were listed and the human chose to split or to keep them all
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-01-clarify-and-route.md
status: active
revision: 1
---

# Judge a multi-goal intent by independent shippable deliverables

**Single goal**: One cohesive feature, even if it spans multiple layers/files. Multi-goal means >=2 **top-level independent shippable deliverables** — each could be reviewed, tested, and merged as a separate PR without breaking the others. Never count surface verbs, "and" conjunctions, or noun phrases. Never split cross-layer implementation details inside one user goal.

Split: "add dark mode toggle AND refactor auth to JWT AND build admin dashboard"

Don't split: "add validation and display errors" / "support drag-and-drop AND paste AND retry"

Multi-goal check (see SCOPE STANDARD). If the intent fails the single-goal criteria:

Present detected distinct goals as a bullet list.

Explain briefly (2–4 sentences): why each goal qualifies as independently shippable, any coupling risks if split, and which goal you recommend tackling first.

HALT and give the user a choice:

**Split** — pick first goal, defer the rest.

**Keep all goals** — accept the risks.
