---
instruction_id: never-hide-a-gap-in-the-evidence
title: Never hide a gap in the evidence
summary: "A missing input is declared and narrows the scope of the analysis; the reader can always tell \"checked and clean\" from \"never checked\"."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
  - evidence-analysis
  - code-audit
conditions_applies_when: An analysis needs an input that the evidence may not contain.
conditions_does_not_apply_when: Every input the analysis needs is available.
artifact_contract_output_type: evidence-gaps
artifact_contract_required_data:
  - the missing input
  - the analysis that was narrowed
  - the narrowed scope
artifact_contract_verified_by: "every gap names the analysis it narrowed, and no analysis that was skipped is presented as clean"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 1
---

# Never hide a gap in the evidence
Evidence availability varies; never hide a gap.
Each later analysis declares what it needs and, when that input is absent, records a narrowed scope rather than guessing.
A reader of the final retro must always be able to tell **"checked and clean"** from **"never checked."**
Missing session logs → process-lesson analysis is skipped, and the retro says so.
No Done when in the epic file → the verdict is profiled from the diff and plans, flagged as profiled rather than declared.
Sub-agents unavailable → analyses that would delegate run inline over a narrowed scope, and the narrowing is recorded.
