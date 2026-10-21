---
instruction_id: never-report-a-state-you-did-not-capture
title: Never report a state you did not capture
summary: An observation that was not made is never written down as observed; the findings that rest on it say they came from the code.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A report describes states that a capture step may or may not have produced.
conditions_does_not_apply_when: Every described state was captured.
artifact_contract_output_type: observation-report
artifact_contract_required_data:
  - the states that were captured
  - the findings that are code-derived
artifact_contract_verified_by: no state that was not captured appears as observed and the code-derived findings say so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-ui-interaction-capture.md
status: active
revision: 1
---

# Never report a state you did not capture
**Never report an interaction state you did not capture** — key off or section skipped, interaction findings are code-derived and say so.
An interaction state that does not appear in that directory is not reported as observed
