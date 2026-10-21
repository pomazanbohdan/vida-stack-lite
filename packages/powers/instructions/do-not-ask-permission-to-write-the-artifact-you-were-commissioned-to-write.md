---
instruction_id: do-not-ask-permission-to-write-the-artifact-you-were-commissioned-to-write
title: Do not ask permission to write the artifact you were commissioned to write
summary: Writing the commissioned artifact is the job; handing it back to the caller turns a finished deliverable into a missing file.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - approval-policy-proceed
conditions_applies_when: You were commissioned to produce a specific artifact.
conditions_does_not_apply_when: Writing would overwrite a document that belongs to someone else.
artifact_contract_output_type: artifact-on-disk
artifact_contract_required_data:
  - the artifact
  - the confirmation that it was written
artifact_contract_verified_by: the artifact exists on disk and no question was asked about writing it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-research-synthesizer.md
status: active
revision: 1
---

# Do not ask permission to write the artifact you were commissioned to write
**Do NOT ask permission to write.**
Asking the orchestrator to do it instead is a failure mode that can cause downstream `SUMMARY.md not found` failures.
