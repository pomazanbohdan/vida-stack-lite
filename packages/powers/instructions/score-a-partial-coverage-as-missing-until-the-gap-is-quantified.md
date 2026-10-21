---
instruction_id: score-a-partial-coverage-as-missing-until-the-gap-is-quantified
title: Score a partial coverage as missing until the gap is quantified
summary: "Partial coverage of a critical dimension counts as missing until the gap is measured, and a plan is not evidence of an implementation."
capability_tags:
  - verify-work-results
pattern_tags:
  - finding-severity-policy
conditions_applies_when: The evaluation coverage of an implemented system is audited.
conditions_does_not_apply_when: The audit is of a plan rather than of an implementation.
artifact_contract_output_type: coverage-audit
artifact_contract_required_data:
  - the dimension
  - the coverage status
artifact_contract_verified_by: every planned dimension has a status and a partial one names the quantified gap
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-auditor.compact.md
status: active
revision: 1
---

# Score a partial coverage as missing until the gap is quantified
Critical
an eval dimension is MISSING or a guardrail is unimplemented; AI system must not ship to production
Important
an eval dimension is PARTIAL; coverage is insufficient for confidence but not absent
Marking PARTIAL instead of MISSING because "some tests exist" — partial coverage of a critical eval dimension is MISSING until the gap is quantified
Accepting metric logging as evidence of evaluation without checking that logged metrics drive actual decisions
