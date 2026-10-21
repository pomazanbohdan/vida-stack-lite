---
instruction_id: compute-the-score-with-the-deterministic-verb-never-by-hand
title: "Compute the score with the deterministic verb, never by hand"
summary: The score comes from the deterministic computation and is written down verbatim.
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A coverage score is produced for a report.
conditions_does_not_apply_when: The report carries counts that were measured directly.
artifact_contract_output_type: coverage-audit
artifact_contract_required_data:
  - the computed score
  - the verdict
artifact_contract_verified_by: the written score equals the computed one and was not recomputed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-auditor.compact.md
status: active
revision: 1
---

# Compute the score with the deterministic verb, never by hand
Do NOT compute scores by hand. Call the deterministic verb with your audited inputs:
Parse the JSON result — it returns `coverage_score`, `infra_score`, `overall_score`, and `verdict`
Use those values verbatim in EVAL-REVIEW.md; never recompute or override them.
