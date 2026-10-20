---
instruction_id: render-the-acceptance-verdict-in-three-spellings
title: Render the acceptance verdict in three spellings
summary: "The final state is judged against the declared criteria and rendered as accepted, accepted-with-open-items or rejected, and a verdict profiled from the diff is marked as profiled."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - code-audit
conditions_applies_when: The retrospective reaches the point where the work is judged against its criteria.
conditions_does_not_apply_when: The completeness check did not run and no verdict can be rendered from the criteria and findings alone.
artifact_contract_output_type: acceptance-verdict
artifact_contract_required_data:
  - the verdict
  - whether the criteria were declared or profiled
  - the evidence behind the call
artifact_contract_verified_by: the verdict is one of the three spellings and it says whether the criteria were declared or profiled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 1
---

# Render the acceptance verdict in three spellings
Judge the final state against the epic file's Done when. If the epic file has none, profile the criteria from the diff and plans and mark the verdict as **profiled** rather than declared.
Weigh verification results (the Phase 2 behavior check) and unresolved findings. Render one of:
- **Accepted** — criteria demonstrably met in the evidence, no blocking findings open, and **no unfinished tickets** for this epic.
- **Accepted-with-open-items** — criteria met, but named findings remain deferred and tracked — still only when every ticket of this epic is finished.
- **Rejected** — criteria not met, a blocking finding stands unresolved, **or any of this epic's tickets is still unfinished**.
