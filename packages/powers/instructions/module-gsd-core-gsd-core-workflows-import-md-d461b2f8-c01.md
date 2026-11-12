---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-import-md-d461b2f8-c01"
title: "gsd-core: gsd-core/workflows/import.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/import.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/import.md\"}"
atom_ids:
  - classify-a-check-result-by-its-severity-not-by-its-marker
  - do-not-write-when-a-blocking-finding-exists
  - validate-an-external-path-against-the-configured-root
atom_count: 3
atoms: "[{\"atom_id\":\"classify-a-check-result-by-its-severity-not-by-its-marker\",\"file_sha256\":\"2119869673f65686d799a21936aa04d7b4e60228f8b18d0115224395eac6bbf4\",\"content_sha256\":\"53db3fc806332a0ac62aef2feebe42bcd763c2684a37771b05032d2e1d0095d3\",\"file_bytes\":1577,\"body_bytes\":346},{\"atom_id\":\"do-not-write-when-a-blocking-finding-exists\",\"file_sha256\":\"c67c72e531b4d81e3cfa7ef2cc7ba09d3c9fc32ba30d6fac5b45109b264341a1\",\"content_sha256\":\"9560b3d0a773315fc8272c66299f70c843e38380346253a6f3328506f3a6e0d0\",\"file_bytes\":1460,\"body_bytes\":269},{\"atom_id\":\"validate-an-external-path-against-the-configured-root\",\"file_sha256\":\"0ee1cb114f3690f0061a7366b3544448a346058e7e9695ee52ee2c8d5e17640b\",\"content_sha256\":\"c55b450cdb7587dacf6a8cc26867957fbd005f3bd2554d002f393069c9d78b18\",\"file_bytes\":1772,\"body_bytes\":496}]"
carrier_sha256: 7df78a2e4d6f0a0aecc95f7699c886f67c3d25cb51839b8d3cf12733c82322fb
carrier_bytes: 5288
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-a-check-result-by-its-severity-not-by-its-marker -->
---
instruction_id: classify-a-check-result-by-its-severity-not-by-its-marker
title: "Classify a check result by its severity, not by its marker"
summary: "A checker result is read entry by entry: the entries decide the outcome, a missing or unknown severity counts as Critical, and Minor entries never block."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A check returned a result that has to be classified.
conditions_does_not_apply_when: The check returned a plain pass with no entries.
artifact_contract_output_type: severity-classification
artifact_contract_required_data:
  - the count of the Critical and Important entries
  - the count of the Minor entries
  - the resulting outcome
artifact_contract_verified_by: "the outcome follows the entries, and an unrecognised severity counts as Critical"
compatibility_excludes: []
compatibility_requires:
  - state-the-severity-of-the-defect
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/import.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify a check result by its severity, not by its marker
Handle the checker return by severity, never by the sentinel alone:
count the entries in the issues block.
an entry whose severity is missing or unrecognized
counts as Critical (fail closed).
Critical: blocks the write.
Important: needs confirmation.
Minor: advisory and never blocks.
<!-- vpmodule:atom:end classify-a-check-result-by-its-severity-not-by-its-marker -->
<!-- vpmodule:atom:begin do-not-write-when-a-blocking-finding-exists -->
---
instruction_id: do-not-write-when-a-blocking-finding-exists
title: Do not write when a blocking finding exists
summary: "A finding classified as Critical stops the write: nothing is created, no partial artefact is left behind, and the gate holds."
capability_tags:
  - harden-validation
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A check produced a finding that is classified as Critical.
conditions_does_not_apply_when: No finding is Critical and only advisory notes remain.
artifact_contract_output_type: write-gate
artifact_contract_required_data:
  - the Critical findings
  - the fact that nothing was written
artifact_contract_verified_by: no destination file exists after a Critical finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/import.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Do not write when a blocking finding exists
If any Critical finding exists:
apply the safety gate from the reference - exit WITHOUT writing any files.
The safety gate holds - no destination files are written when Critical findings exist.
Nothing partial is produced.
<!-- vpmodule:atom:end do-not-write-when-a-blocking-finding-exists -->
<!-- vpmodule:atom:begin validate-an-external-path-against-the-configured-root -->
---
instruction_id: validate-an-external-path-against-the-configured-root
title: Validate an external path against the configured root
summary: A supplied path is canonicalised and checked against the configured root before it is read; traversal sequences and absolute paths outside the root are rejected.
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A path that comes from the request is used to reach a file.
conditions_does_not_apply_when: The path was produced inside the run and is already known to be inside the root.
artifact_contract_output_type: path-validation
artifact_contract_required_data:
  - the canonicalised path
  - the root it was checked against
  - the rejection reason
artifact_contract_verified_by: no path outside the configured root is ever read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/import.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate an external path against the configured root
After resolving the scan path and the manifest path relative to the repo root, canonicalize each with realpath (or platform equivalent) and assert the result is under the canonicalised repo root.
Reject absolute paths outside the repo (e.g. `/tmp`, `C:\Windows`) even when they do not contain `..`.
Verify the path does not contain traversal sequences and the file exists:
Canonicalise before you compare.
Traversal sequences are rejected.
<!-- vpmodule:atom:end validate-an-external-path-against-the-configured-root -->