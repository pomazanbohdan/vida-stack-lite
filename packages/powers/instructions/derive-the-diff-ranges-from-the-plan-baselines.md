---
instruction_id: derive-the-diff-ranges-from-the-plan-baselines
title: Derive the diff ranges from the plan baselines
summary: "Every piece of work has its own baseline, the ranges run from one baseline to the next in the order the builds started, and a piece with no baseline is recorded as having no evidence."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
  - evidence-analysis
conditions_applies_when: The changes of a finished body of work have to be turned into ranges.
conditions_does_not_apply_when: The ranges are already fixed.
artifact_contract_output_type: diff-ranges
artifact_contract_required_data:
  - the range of each piece of work
  - the order the ranges were derived in
  - the pieces that have no range and why
artifact_contract_verified_by: "every range names its baseline and its end, and a range that could not be established is recorded as missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 1
---

# Derive the diff ranges from the plan baselines
Each plan records its own `baseline_revision`, the commit its build started from, so there is no single epic-wide range.
Order the plans by their baselines' place in history, oldest first
The order the builds started, which need not be the row order.
A plan's range runs from its baseline to the next baseline in that order; the last plan's range runs to `HEAD`, marked inferred rather than recorded.
When later work has landed since, end it at the last commit that belongs to this epic's tickets, judged from the plans and commit subjects, and record the cut.
A plan whose `baseline_revision` is missing or `NO_VCS` gets no commit or diff evidence — record that too.
Two plans sharing a baseline give the earlier one an empty range: that ticket simply has no commits of its own.
Group the tickets sharing an identical range
once per distinct range.
A commit's `stories` is usually empty, since subjects rarely name a ref; the range is the attribution, and an empty list is not missing evidence.
Ranges may overlap or diverge; count a shared commit or file change once in the aggregate views while keeping each ticket's range as its provenance.
