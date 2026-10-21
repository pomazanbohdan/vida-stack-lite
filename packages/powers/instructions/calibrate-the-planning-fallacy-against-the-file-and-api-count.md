---
instruction_id: calibrate-the-planning-fallacy-against-the-file-and-api-count
title: Calibrate the planning fallacy against the file and API count
summary: "A task called simple is checked against the files it touches, the APIs it needs and the infrastructure it modifies."
capability_tags:
  - review-code
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A plan estimates a task as simple or small.
conditions_does_not_apply_when: The task is a one-line change.
artifact_contract_output_type: effort-calibration
artifact_contract_required_data:
  - the files touched
  - the unfamiliar APIs
  - the shared infrastructure
artifact_contract_verified_by: the estimate was checked against the three signals
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-verification.md
status: active
revision: 1
---

# Calibrate the planning fallacy against the file and API count
For each task estimated as "simple" or "small", check: does it touch more than 2 files? Does it require understanding an unfamiliar API? Does it modify shared infrastructure? If yes to any, flag as likely underestimated. Plans with >5 tasks or tasks touching >4 files per task are over-scoped
