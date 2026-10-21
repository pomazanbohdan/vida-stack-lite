---
instruction_id: rank-the-suspicious-locations-by-the-failing-spectrum
title: Rank the suspicious locations by the failing-test spectrum
summary: "When a runnable suite with per-test coverage exists, the code that failing tests execute disproportionately is ranked first."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A runnable test suite exists with both failing and passing tests and per-test coverage.
conditions_does_not_apply_when: "There is no coverage data, or every test passes."
artifact_contract_output_type: suspicion-ranking
artifact_contract_required_data:
  - the ranked locations
  - the score of each
  - the reason the step was skipped
artifact_contract_verified_by: the ranking is written down with the evidence behind it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-sbfl.md
status: active
revision: 1
---

# Rank the suspicious locations by the failing-test spectrum
A deterministic ranked "where to look first" list derived from existing test pass/fail coverage, computed before LLM reasoning over an unranked search space.
Run only when ALL hold:
A runnable test suite exists for the failing area.
At least one failing test AND at least one passing test exist (a spectrum requires both).
Per-test coverage is available (which tests executed which code element — function, line, or branch).
Rank all executed elements by descending Ochiai score and take the **top-N**
This narrows the search space by orders of magnitude before any LLM tokens are spent forming hypotheses.
If any precondition fails, **skip** this step with a logged note
