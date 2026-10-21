---
instruction_id: never-let-a-missing-tool-look-like-an-empty-result
title: Never let a missing tool look like an empty result
summary: A field is read with a query that is total over its input space; a pipeline through a tool that may be absent yields an empty value with no diagnostic and routes a good result into the recovery path.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A value is read from a report or a result by a command that may not exist everywhere.
conditions_does_not_apply_when: The value is read by a command that is guaranteed to be present.
artifact_contract_output_type: value-read
artifact_contract_required_data:
  - the value
  - the command that read it
artifact_contract_verified_by: the read cannot return an empty value when the tool is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/quick-verification.md
status: active
revision: 1
---

# Never let a missing tool look like an empty result
a `| jq -r '.field'` pipe yields an **empty** variable with no diagnostic
which here would route a perfectly good `passed` verification into the recovery arm below
That is deliberate
