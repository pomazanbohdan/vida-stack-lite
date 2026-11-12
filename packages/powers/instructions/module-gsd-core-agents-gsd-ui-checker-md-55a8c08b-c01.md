---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-ui-checker-md-55a8c08b-c01"
title: "gsd-core: agents/gsd-ui-checker.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-ui-checker.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-ui-checker.md\"}"
atom_ids:
  - read-artifacts-without-overflow
  - treat-an-unfilled-template-token-as-a-missing-value
atom_count: 2
atoms: "[{\"atom_id\":\"read-artifacts-without-overflow\",\"file_sha256\":\"04d056b82670e46206dd861937b7526ca3cc1a30fbd0e5a6c941846dcbc31514\",\"content_sha256\":\"b55acbaa3ce49b85e30bc36a73b4ec6fdde115a789228339d2087b376edd39bc\",\"file_bytes\":2199,\"body_bytes\":979},{\"atom_id\":\"treat-an-unfilled-template-token-as-a-missing-value\",\"file_sha256\":\"d05217a25bdce76d56ca12b9259236fcfe28126b2750840b301fe9fbf087bc34\",\"content_sha256\":\"231db2e560e8963973a496559af4a27b6494c18c4e2ab472357ad30f1924c741\",\"file_bytes\":1485,\"body_bytes\":377}]"
carrier_sha256: 6fa84617fc787dcd6cd64ffb1e9947d0d75da95581cd1250a3873b28996f76ba
carrier_bytes: 3963
revision: 1
status: active
---
<!-- vpmodule:atom:begin read-artifacts-without-overflow -->
---
instruction_id: read-artifacts-without-overflow
title: Read large artifacts without overflowing context
summary: "Measure the file first, take line numbers and counts before content, and narrow any record over 500 characters."
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: An artifact must be read and its size or content may exceed the available context.
conditions_does_not_apply_when: The artifact is known to be short and fits one read.
artifact_contract_output_type: bounded-reading-record
artifact_contract_required_data:
  - artifact size
  - reading bounds
  - extracted fields
  - unread parts
artifact_contract_verified_by: a measured artifact and bounded excerpts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/references/context-safety.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read large artifacts without overflowing context
One transcript record can exceed a megabyte or embed a whole history.
Printing one whole record can overflow the context of the session doing the diagnosis.
Every reader of a session file follows these rules for every file, every time.
That includes a controller and a subagent.
Measure before reading.
Get the line and byte counts, and list long lines.
Never `cat` or `grep` for content.
Get line numbers and counts first.
Then take small fields from specific lines.
Use the field-extraction commands established during discovery.
Apply them to the source in front of you.
Narrow anything over 500 characters.
If a command returns more than 500 characters for one record, tighten the field or the slice.
Read-only: never modify, move, or delete a session file.

**Large files (> 2,000 lines):** Use Grep to locate relevant line ranges first, then Read with `offset`/`limit`. Never reload the whole file for a second dimension.
<!-- vpmodule:atom:end read-artifacts-without-overflow -->
<!-- vpmodule:atom:begin treat-an-unfilled-template-token-as-a-missing-value -->
---
instruction_id: treat-an-unfilled-template-token-as-a-missing-value
title: Treat an unfilled template token as a missing value
summary: "A placeholder still carrying its template spelling is the template speaking, not the artefact; it counts as absent, never as a value."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: A document under review carries placeholder tokens that were never filled in.
conditions_does_not_apply_when: Every placeholder has been replaced by a real value.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the unfilled token
  - the verdict it forced
artifact_contract_verified_by: every unfilled token is treated as absent and no verdict rests on the template text
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat an unfilled template token as a missing value
The line still carries the template's **unfilled placeholders** — a literal `` `<command>` ``, `<N>`, `<package>@<version>`, `<YYYY-MM-DD>` or `<reason>` is the template speaking, not the spec. Treat an unfilled token as absent, exactly as Dimension 6 treats `shadcn view + diff required` as intent rather than evidence.
<!-- vpmodule:atom:end treat-an-unfilled-template-token-as-a-missing-value -->