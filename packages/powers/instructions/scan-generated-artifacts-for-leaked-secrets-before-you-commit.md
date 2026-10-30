---
instruction_id: scan-generated-artifacts-for-leaked-secrets-before-you-commit
title: Scan the generated artifacts for leaked secrets before you commit
summary: Generated documents are scanned for secret patterns before they are committed; a hit pauses the commit and names what was found.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: Documents produced by a run are about to be committed.
conditions_does_not_apply_when: Nothing generated in this run is being committed.
artifact_contract_output_type: secret-scan
artifact_contract_required_data:
  - the detected patterns
  - the files that hold them
  - the pause before the commit
artifact_contract_verified_by: no commit happens while a detected secret is still in the files
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/map-codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scan the generated artifacts for leaked secrets before you commit
CRITICAL SECURITY CHECK: Scan output files for accidentally leaked secrets before committing.
This would expose credentials if committed.
If these are real secrets, they must be removed before committing
Pausing before commit. Reply "safe to proceed" if the flagged content is not actually sensitive, or edit the files first.
