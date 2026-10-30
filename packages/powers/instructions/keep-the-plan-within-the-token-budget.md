---
instruction_id: keep-the-plan-within-the-token-budget
title: Keep the plan within the token budget
summary: A plan targets 900–1300 tokens and stays inside 900–1600; past the upper bound the plan is regenerated for the narrowed goal instead of being carved up.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan has been written and its length is known.
conditions_does_not_apply_when: The work is a single change with no plan document.
artifact_contract_output_type: plan-size-check
artifact_contract_required_data:
  - the token count of the plan
  - the decision to split or to keep the full plan
  - the narrowed goal when the plan was split
artifact_contract_verified_by: the token count was shown and the plan was either regenerated for one goal or kept with the count stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the plan within the token budget

Target: 900–1300 tokens (less if route is oneshot). Above 1600 = high risk of context rot.

**900–1600 tokens**: Optimal range for LLM consumption. Below 900 risks ambiguity; above 1600 risks context-rot in implementation agents.

Cohesive cross-layer changes (DB+BE+UI) stay in ONE file.

**Token count** (see SCOPE STANDARD). If the plan exceeds 1600 tokens, show the count and give the user a choice:

**Split** — carve off secondary goals. Propose the split — name each secondary goal.

Rewrite the current plan to cover only the main goal — do not surgically carve sections out; regenerate the plan for the narrowed scope.

**Keep full plan** — accept the risks.

If token count exceeded 1600 and the user chose to keep the full plan, include the token count and explain why it may be a problem.
