---
instruction_id: never-read-the-secret-files-when-you-explore
title: Never read the secret files when you explore
summary: "Credential, key and environment files are skipped silently and nothing from them reaches the knowledge base."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - data-minimization
conditions_applies_when: The repository is explored for its knowledge base.
conditions_does_not_apply_when: The task is to check the content of a specific credential file.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the explored files
artifact_contract_verified_by: no secret file was read and no secret value appears in the output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.compact.md
status: active
revision: 1
---

# Never read the secret files when you explore
When exploring, NEVER read or include in your output:
Files containing `credential` or `secret` in their name
If encountered, skip silently. Do NOT include contents.
DO NOT include secrets or credentials in intel output
