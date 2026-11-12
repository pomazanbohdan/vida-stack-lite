---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-docs-update-md-16fae6e7-c02"
title: "gsd-core: gsd-core/workflows/docs-update.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/docs-update.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/docs-update.md\"}"
atom_ids:
  - restore-the-file-when-a-fix-truncates-it
  - scan-what-you-generated-before-you-commit
  - show-where-each-file-will-be-written-before-you-write-it
  - take-the-scope-from-the-list-not-from-what-exists-on-disk
  - verify-the-doc-claims-against-the-live-codebase
atom_count: 5
atoms: "[{\"atom_id\":\"restore-the-file-when-a-fix-truncates-it\",\"file_sha256\":\"84f003a49129155d7ae627ac7cfcf64b2c5a8afd7e8c958c3cb28dfd55dfb18f\",\"content_sha256\":\"c9b69c33bed684e6ffa02c09c9ab3e7163ca3054d12dee99253d9873c3fada8e\",\"file_bytes\":1458,\"body_bytes\":361},{\"atom_id\":\"scan-what-you-generated-before-you-commit\",\"file_sha256\":\"7f42eb0cf42fcfbf80e4cb855a7407b13b3d73d60347b34a51c3becc49c44653\",\"content_sha256\":\"9453d9d48b137d41516770d1477af5b5218726c71455ce8ce3367e1abb14de3f\",\"file_bytes\":1443,\"body_bytes\":430},{\"atom_id\":\"show-where-each-file-will-be-written-before-you-write-it\",\"file_sha256\":\"b68bda72c41e4ed5f35b4661decd2279715d7465d3cb03e37862f592a894440f\",\"content_sha256\":\"c9176855b2d24d65e4fcc4cd891374e70396b19a10e3e3fb3eea29c51785e0b3\",\"file_bytes\":1665,\"body_bytes\":575},{\"atom_id\":\"take-the-scope-from-the-list-not-from-what-exists-on-disk\",\"file_sha256\":\"933e8bb96db6f557238260a6acd0c780716c627a6a4a98b8d6220159bab7e733\",\"content_sha256\":\"b9a34fe7011811d092755dd98422b871998e060a426c26f603f0340490257af8\",\"file_bytes\":1386,\"body_bytes\":275},{\"atom_id\":\"verify-the-doc-claims-against-the-live-codebase\",\"file_sha256\":\"1b20cff336efd99ced1b02b47ab8ebd6dd91c3f54b4086ce04a02daf7c75e1a4\",\"content_sha256\":\"05864371c85633e99ae0962cbada9f86dc3e0e6709444f712d78318ea6df81bd\",\"file_bytes\":1259,\"body_bytes\":210}]"
carrier_sha256: 8995c73fc249c958fca0b2720d829a77b12dafd275ebdc653a229a850c4735d5
carrier_bytes: 7982
revision: 1
status: active
---
<!-- vpmodule:atom:begin restore-the-file-when-a-fix-truncates-it -->
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
<!-- vpmodule:atom:end restore-the-file-when-a-fix-truncates-it -->
<!-- vpmodule:atom:begin scan-what-you-generated-before-you-commit -->
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
<!-- vpmodule:atom:end scan-what-you-generated-before-you-commit -->
<!-- vpmodule:atom:begin show-where-each-file-will-be-written-before-you-write-it -->
---
instruction_id: show-where-each-file-will-be-written-before-you-write-it
title: Show where each file will be written before you write it
summary: "The resolved path, the mode and the source of every item are shown once, before the write."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A set of files is about to be written.
conditions_does_not_apply_when: A single file is written and its path is not in question.
artifact_contract_output_type: work-manifest
artifact_contract_required_data:
  - the resolved path of every item
  - the mode of every item
  - the source of every item
artifact_contract_verified_by: the table was shown before the write and it was not duplicated in another shape
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
  - operations
---

# Show where each file will be written before you write it
Present a table showing the resolved path, mode, and source for every doc in the queue:
This table MUST be shown to the user — it is the primary confirmation of where files will be written and whether existing files will be updated.
The mode resolution table IS the queue presentation — it shows every doc with its resolved path, mode, and source. Do not duplicate the list in a separate format.
Present the assembled queue to the user before proceeding:
Doc queue assembled ({N} docs). Proceed with generation?
<!-- vpmodule:atom:end show-where-each-file-will-be-written-before-you-write-it -->
<!-- vpmodule:atom:begin take-the-scope-from-the-list-not-from-what-exists-on-disk -->
---
instruction_id: take-the-scope-from-the-list-not-from-what-exists-on-disk
title: "Take the scope from the list, not from what exists on disk"
summary: The set of items comes from the list; the files on disk only decide create or update.
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The set of items to produce is being assembled.
conditions_does_not_apply_when: The set of items is already fixed and only the work is being ordered.
artifact_contract_output_type: work-manifest
artifact_contract_required_data:
  - the list the scope comes from
  - the mode of each item
artifact_contract_verified_by: the list of items came from the list and the existing files only decided create or update
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Take the scope from the list, not from what exists on disk
The doc queue is built exclusively from the 9 known doc types listed above.
Do not derive the queue from `existing_docs` directly — existing_docs is only used in the next step to determine create vs update mode.
<!-- vpmodule:atom:end take-the-scope-from-the-list-not-from-what-exists-on-disk -->
<!-- vpmodule:atom:begin verify-the-doc-claims-against-the-live-codebase -->
---
instruction_id: verify-the-doc-claims-against-the-live-codebase
title: Verify the doc claims against the live codebase
summary: "Every document, generated or hand-written, is checked against the live codebase."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: Documentation has been written and its claims are about to be trusted.
conditions_does_not_apply_when: The document is a plan that describes intent rather than the system.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the claims checked
  - the failures found
artifact_contract_verified_by: every document in the set was checked against the live codebase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Verify the doc claims against the live codebase
Verify factual claims in ALL docs — both canonical (generated) and non-canonical (existing hand-written) — against the live codebase.
This is NOT optional.
<!-- vpmodule:atom:end verify-the-doc-claims-against-the-live-codebase -->