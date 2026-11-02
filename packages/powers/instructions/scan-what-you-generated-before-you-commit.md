---
instruction_id: scan-what-you-generated-before-you-commit
title: Scan what you generated before you commit
summary: The files that were actually written are scanned for leaked secrets before the commit.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: Files have been written and are about to be committed.
conditions_does_not_apply_when: Nothing was written in this run.
artifact_contract_output_type: security-report
artifact_contract_required_data:
  - the files scanned
  - the patterns found
artifact_contract_verified_by: the list of scanned files is the list of files that were actually written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scan what you generated before you commit
CRITICAL SECURITY CHECK: Scan all generated/updated doc files for accidentally leaked secrets before committing.
Build the file list from the generation queue -- include all docs that were written to disk (created, updated, supplemented, or fixed). Do not hardcode a static list; use the actual list of files that were generated or modified.
This would expose credentials if committed.
