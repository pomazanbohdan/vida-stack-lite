---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-codebase-mapper-compact-md-701d0751-c01"
title: "gsd-core: agents/gsd-codebase-mapper.compact.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:agents/gsd-codebase-mapper.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-codebase-mapper.compact.md\"}"
atom_ids:
  - describe-the-current-state-only
  - note-a-secret-file-by-its-existence-and-never-quote-it
  - write-the-file-path-with-every-claim-about-the-codebase
  - write-the-map-documents-directly-and-return-only-a-confirmation
atom_count: 4
atoms: "[{\"atom_id\":\"describe-the-current-state-only\",\"file_sha256\":\"e13490e84a324e9b7de9641e1f6d9abd13a4c69ba9885ad16c4ca24b0c45d60f\",\"content_sha256\":\"1d93a9521976b8d01161eb53d2c06e1363ab16efa4a1385c1cc95a2ae13f6f73\",\"file_bytes\":1311,\"body_bytes\":205},{\"atom_id\":\"note-a-secret-file-by-its-existence-and-never-quote-it\",\"file_sha256\":\"26026ff8ef075b371b66d8de044ac3ef0d744540205c23663f7cbe832d9e576e\",\"content_sha256\":\"7f54f10b69560980bd99d5a606bbd856492b510c671e6f460e28e9deac260cfd\",\"file_bytes\":1505,\"body_bytes\":318},{\"atom_id\":\"write-the-file-path-with-every-claim-about-the-codebase\",\"file_sha256\":\"1b7606c3d537892de9b517acda40d6bfd522ef962bee460c23c634996cf1e21a\",\"content_sha256\":\"32bb0e31b010884ba49a27cfe88bf856abd63e9bbcb5a374644c15b70614031f\",\"file_bytes\":1580,\"body_bytes\":393},{\"atom_id\":\"write-the-map-documents-directly-and-return-only-a-confirmation\",\"file_sha256\":\"7f5d741c9eedd7f686ad27bf3fd678c8dc5d075a42ee3e7d6dd604edf9b8a38e\",\"content_sha256\":\"e69e28d74dc46a23a7949dd005c0789727db8224f79a5a7d2eb981e25f394c39\",\"file_bytes\":1499,\"body_bytes\":330}]"
carrier_sha256: 1c8532b4d7c8256424f5422eaa9b800743753b5e8d34729fb1176b925e5b6968
carrier_bytes: 6532
revision: 1
status: active
---
<!-- vpmodule:atom:begin describe-the-current-state-only -->
---
instruction_id: describe-the-current-state-only
title: Describe the current state only
summary: "The description says what the code is, never what it was or what was considered, and it is read rather than guessed."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The current behaviour of a repository is documented.
conditions_does_not_apply_when: The document records a decision and its history.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the current state
artifact_contract_verified_by: no temporal wording and every statement was read from a file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Describe the current state only
Write current state only: Describe only what IS, never what WAS or what you considered. No temporal language.
BE THOROUGH. Explore deeply. Read actual files. Don't guess.
<!-- vpmodule:atom:end describe-the-current-state-only -->
<!-- vpmodule:atom:begin note-a-secret-file-by-its-existence-and-never-quote-it -->
---
instruction_id: note-a-secret-file-by-its-existence-and-never-quote-it
title: Note a secret file by its existence and never quote it
summary: "A credential file is recorded as present; its contents never appear in the output, not even in part."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: "A credential, key or environment file is found while exploring."
conditions_does_not_apply_when: The file is an example file that carries placeholder values only.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the existence of the file
artifact_contract_verified_by: no value from a credential file appears in the output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Note a secret file by its existence and never quote it
NEVER read or quote contents from these files (even if they exist):
Note their EXISTENCE only: ".env file present - contains environment configuration"
NEVER quote their contents, even partially
NEVER include values like `API_KEY=...` or `sk-...` in any output
<!-- vpmodule:atom:end note-a-secret-file-by-its-existence-and-never-quote-it -->
<!-- vpmodule:atom:begin write-the-file-path-with-every-claim-about-the-codebase -->
---
instruction_id: write-the-file-path-with-every-claim-about-the-codebase
title: Write the file path with every claim about the codebase
summary: "Every statement about the code carries the path it came from and shows how the code does it, not only that it exists."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A map of an existing codebase is written.
conditions_does_not_apply_when: The document describes something that does not live in the repository.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the file path
  - the pattern shown
artifact_contract_verified_by: every claim names a file path and the pattern is shown with an example
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the file path with every claim about the codebase
Always include file paths: Vague descriptions like "UserService handles users" are not actionable. Always include actual file paths formatted with backticks: `src/services/user.ts`.
Patterns matter more than lists - Show HOW things are done (code examples) not just WHAT exists
"Use X pattern" is more useful than "X pattern is used."
<!-- vpmodule:atom:end write-the-file-path-with-every-claim-about-the-codebase -->
<!-- vpmodule:atom:begin write-the-map-documents-directly-and-return-only-a-confirmation -->
---
instruction_id: write-the-map-documents-directly-and-return-only-a-confirmation
title: Write the map documents directly and return only a confirmation
summary: The analysis is written to its files; the reply names what was written and nothing else.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: An analysis of an existing codebase is produced.
conditions_does_not_apply_when: The answer is a short question with no artifact to write.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the files written
  - their line counts
artifact_contract_verified_by: the reply is a short confirmation and the documents hold the content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the map documents directly and return only a confirmation
WRITE DOCUMENTS DIRECTLY. Do not return findings to orchestrator. The whole point is reducing context transfer.
RETURN ONLY CONFIRMATION. Your response should be ~10 lines max. Just confirm what was written.
DO NOT COMMIT. The orchestrator handles git operations.
<!-- vpmodule:atom:end write-the-map-documents-directly-and-return-only-a-confirmation -->