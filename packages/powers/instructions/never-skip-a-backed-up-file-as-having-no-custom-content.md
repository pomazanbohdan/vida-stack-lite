---
instruction_id: never-skip-a-backed-up-file-as-having-no-custom-content
title: Never skip a backed-up file as having no custom content
summary: "A file that was backed up because it was detected as modified can never be classified as free of custom content; when the difference looks mechanical it is still a conflict for the owner, not a silent skip."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A set of backed-up files is classified after a replacement of the originals.
conditions_does_not_apply_when: A file was never detected as modified and was never backed up.
artifact_contract_output_type: file-classification
artifact_contract_required_data:
  - the file
  - the detected differences
  - the classification
artifact_contract_verified_by: no backed-up file was classified as having no custom content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 1
---

# Never skip a backed-up file as having no custom content
The workflow must NEVER conclude "no custom content" for any backed-up file — that is a logical contradiction
When in doubt, classify as CONFLICT requiring user review, not SKIP
"No custom content" is never a valid conclusion
The installer's hash check already proved this file was modified
Never report `Skipped — no custom content`
