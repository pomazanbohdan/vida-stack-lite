---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-intel-updater-compact-md-4c68ade4-c01"
title: "gsd-core: agents/gsd-intel-updater.compact.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:agents/gsd-intel-updater.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-intel-updater.compact.md\"}"
atom_ids:
  - keep-the-intel-file-within-its-output-budget
  - merge-a-partial-update-instead-of-rewriting-the-whole-intel-file
  - never-read-the-secret-files-when-you-explore
  - write-machine-parseable-intel-with-a-file-path-on-every-claim
atom_count: 4
atoms: "[{\"atom_id\":\"keep-the-intel-file-within-its-output-budget\",\"file_sha256\":\"230b584b8c19a6c14afe675e1ad95f8c471709d7cb2f862cc949be5dd82f7216\",\"content_sha256\":\"96105228ba7a50ed48ebfc52cfe3c268190f16e5af416af0ad46387890212868\",\"file_bytes\":1461,\"body_bytes\":311},{\"atom_id\":\"merge-a-partial-update-instead-of-rewriting-the-whole-intel-file\",\"file_sha256\":\"b80ce920e54352b06d8b41fbd3ea7248dbfdd2abb59d6d72005a34e8bc06fe86\",\"content_sha256\":\"5f8ca67ed806bf3abee9e04500d32e46cda4d65c9f92aadbfc78c61e33da4262\",\"file_bytes\":1429,\"body_bytes\":292},{\"atom_id\":\"never-read-the-secret-files-when-you-explore\",\"file_sha256\":\"f3d6d37f6d28f8585073be0f595df88ef4c130172fd2d25c00ddba09eb7c79db\",\"content_sha256\":\"cbef578abce7bcc459847a2549018360e2c36f180a536ae29f918b362c4e6c00\",\"file_bytes\":1423,\"body_bytes\":267},{\"atom_id\":\"write-machine-parseable-intel-with-a-file-path-on-every-claim\",\"file_sha256\":\"e5fb700db0449cedc0092692cf7601a365b19d94dce252de41ddda1c14d72d3e\",\"content_sha256\":\"b5e1f2c9d12f4b5b8d8cc060954ceff71876061ab49f6c8a1e1fc57ece3fdaa0\",\"file_bytes\":1556,\"body_bytes\":368}]"
carrier_sha256: bc726e5e82a65f86d6b698cbdf2cc18dc5b5f88e1d3fa3d92984ef2477345b4f
carrier_bytes: 6526
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-intel-file-within-its-output-budget -->
---
instruction_id: keep-the-intel-file-within-its-output-budget
title: Keep the intel file within its output budget
summary: The most important files are listed and the rest is left out rather than the budget being blown.
capability_tags:
  - communicate-concisely
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A knowledge base file about a large codebase is written.
conditions_does_not_apply_when: The codebase is small enough to list exhaustively.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the listed files
artifact_contract_verified_by: the file stays inside the stated budget and the key files are the ones listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Keep the intel file within its output budget
For large codebases, prioritize coverage of key files over exhaustive listing.
Include the most important 50-100 source files in file-roles.json rather than attempting to list every file.
DO NOT exceed output budget -- prioritize key files over exhaustive listing
<!-- vpmodule:atom:end keep-the-intel-file-within-its-output-budget -->
<!-- vpmodule:atom:begin merge-a-partial-update-instead-of-rewriting-the-whole-intel-file -->
---
instruction_id: merge-a-partial-update-instead-of-rewriting-the-whole-intel-file
title: Merge a partial update instead of rewriting the whole intel file
summary: An update that names a few files changes only the entries that mention them and keeps the rest.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - incremental-cutover
conditions_applies_when: Only part of the knowledge base has to be refreshed.
conditions_does_not_apply_when: The whole knowledge base is rebuilt.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the changed entries
artifact_contract_verified_by: the untouched entries survived and only the named files changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Merge a partial update instead of rewriting the whole intel file
Only update entries in file-roles.json/api-map.json/dependency-graph.json that reference the given paths
Preserve existing entries not related to the specified paths
Read existing intel files first, merge updates, write back
<!-- vpmodule:atom:end merge-a-partial-update-instead-of-rewriting-the-whole-intel-file -->
<!-- vpmodule:atom:begin never-read-the-secret-files-when-you-explore -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never read the secret files when you explore
When exploring, NEVER read or include in your output:
Files containing `credential` or `secret` in their name
If encountered, skip silently. Do NOT include contents.
DO NOT include secrets or credentials in intel output
<!-- vpmodule:atom:end never-read-the-secret-files-when-you-explore -->
<!-- vpmodule:atom:begin write-machine-parseable-intel-with-a-file-path-on-every-claim -->
---
instruction_id: write-machine-parseable-intel-with-a-file-path-on-every-claim
title: Write machine-parseable intel with a file path on every claim
summary: "The knowledge base is structured, every claim points at the code it came from, and nothing is inferred from names."
capability_tags:
  - curate-context
pattern_tags:
  - evidence-analysis
conditions_applies_when: A queryable knowledge base about a codebase is written.
conditions_does_not_apply_when: The output is prose for a reader rather than a lookup for a tool.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the entries
  - the file path of each entry
artifact_contract_verified_by: every entry names a real file path and is parseable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-intel-updater.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write machine-parseable intel with a file path on every claim
Write machine-parseable, evidence-based intelligence. Every claim references actual file paths. Prefer structured JSON over prose.
Always include file paths. Every claim must reference the actual code location.
Evidence-based. Read the actual files. Do not guess from file names or directory structures.
<!-- vpmodule:atom:end write-machine-parseable-intel-with-a-file-path-on-every-claim -->