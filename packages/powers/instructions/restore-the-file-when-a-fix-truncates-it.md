---
instruction_id: restore-the-file-when-a-fix-truncates-it
title: Restore the file when a fix truncates it
summary: A repair that shrinks a file past the corruption threshold is rolled back and the file is marked.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A repair agent has rewritten a file and the result is suspiciously short.
conditions_does_not_apply_when: The file was not touched by a repair agent.
artifact_contract_output_type: restoration-record
artifact_contract_required_data:
  - the file
  - the length before
  - the length after
  - the restored content
artifact_contract_verified_by: the pre-repair content is back and the file is marked as needing manual correction
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

# Restore the file when a fix truncates it
Post-fix truncation guard: After the fix agent completes, check for file corruption:
the fix agent corrupted the file via a full-file Write. Restore it immediately:
Mark this doc as `"fix-corrupted"` in the manifest; it will appear in remaining failures at the end
Do NOT attempt to fix this doc again this iteration.
