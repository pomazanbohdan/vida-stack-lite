---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-progress-steps-forensic-audit-md-e7512b95-c01"
title: "gsd-core: gsd-core/workflows/progress/steps/forensic-audit.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/progress/steps/forensic-audit.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/progress/steps/forensic-audit.md\"}"
atom_ids:
  - audit-the-state-before-you-act-on-the-report
  - cross-check-the-record-against-the-artifacts
  - treat-an-unmarked-item-as-open
  - verify-that-every-deferral-has-a-destination
atom_count: 4
atoms: "[{\"atom_id\":\"audit-the-state-before-you-act-on-the-report\",\"file_sha256\":\"1d277cc03efce51ad72696b2f4284b11dba9ceeb15ca8ca8c0287781423e2922\",\"content_sha256\":\"4ebe66054e2a68523e8968300b89750f6510aa0b81279a1b91e2d5c096b51f8d\",\"file_bytes\":1557,\"body_bytes\":308},{\"atom_id\":\"cross-check-the-record-against-the-artifacts\",\"file_sha256\":\"dfcdb6dc147214b3efd4f54933e9b4e4745c24da289bcd0cdbd40c53e2173c74\",\"content_sha256\":\"2b0d65d69191f4102fb8e44fd6c96b57a00223141ccdcd6d50fa26fe9f58f0b3\",\"file_bytes\":1273,\"body_bytes\":173},{\"atom_id\":\"treat-an-unmarked-item-as-open\",\"file_sha256\":\"accc4ac5a9ae57cd942a3f8f81f48e82861cbd265e556c8600b51972fa9c93d1\",\"content_sha256\":\"9b514de8459f0e352db4c1b4cd4ab3c92c609cd2e7b5726565bd678dbcdd41bd\",\"file_bytes\":1208,\"body_bytes\":192},{\"atom_id\":\"verify-that-every-deferral-has-a-destination\",\"file_sha256\":\"58fbec206f2edebe5045237634f37c955c088271ae1788f57a8e5f8f7dd27504\",\"content_sha256\":\"f5d5e993ca3f7d8365a986f989bd70a015b42294815ec80e2840d3015cb75f04\",\"file_bytes\":1200,\"body_bytes\":161}]"
carrier_sha256: aef4b4e0d34f71c4827b95dd0a6957c587118b2b65063569af5e219647aee2c9
carrier_bytes: 5793
revision: 1
status: active
---
<!-- vpmodule:atom:begin audit-the-state-before-you-act-on-the-report -->
---
instruction_id: audit-the-state-before-you-act-on-the-report
title: Audit the state before you act on the report
summary: The state is checked against the artefacts before the report is acted on; every check emits a pass or a warning with concrete evidence.
capability_tags:
  - audit-codebase
  - verify-work-results
pattern_tags:
  - dimension-sweep
  - evidence-analysis
conditions_applies_when: A report about the state of the work is about to be used to decide what happens next.
conditions_does_not_apply_when: The report was produced by the check itself in this run.
artifact_contract_output_type: integrity-audit
artifact_contract_required_data:
  - each check and its verdict
  - the concrete evidence behind every warning
  - the next action for every failed check
artifact_contract_verified_by: every check emitted a verdict with evidence and every failed check names a next action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Audit the state before you act on the report
Run each check in order. For each check, emit ✓ (pass) or ⚠ (warning) with concrete evidence when a problem is found.

The standard progress report may not reflect true project state. Review the flagged items above before acting on the routing suggestion.

<!-- vpmodule:atom:end audit-the-state-before-you-act-on-the-report -->
<!-- vpmodule:atom:begin cross-check-the-record-against-the-artifacts -->
---
instruction_id: cross-check-the-record-against-the-artifacts
title: Cross-check the record against the artifacts
summary: "The recorded state is compared with the artifacts on disk, and a contradiction between them is reported."
capability_tags:
  - triage-reports
pattern_tags:
  - evidence-analysis
conditions_applies_when: A record states that work is pending.
conditions_does_not_apply_when: The record was written by the run that produced the artifacts.
artifact_contract_output_type: state-consistency-check
artifact_contract_required_data:
  - the recorded state
  - the artifact count
  - the inconsistency when there is one
artifact_contract_verified_by: the record and the artifacts were compared and a contradiction was reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Cross-check the record against the artifacts
Compare against the artifact count from the roadmap analysis.
but the artifact count shows it as complete
flag inconsistency.
<!-- vpmodule:atom:end cross-check-the-record-against-the-artifacts -->
<!-- vpmodule:atom:begin treat-an-unmarked-item-as-open -->
---
instruction_id: treat-an-unmarked-item-as-open
title: Treat an unmarked item as open
summary: A deferred item counts as resolved only when it says so; an item without that mark is surfaced.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Deferred items are read to see which of them are still open.
conditions_does_not_apply_when: Every deferred item carries its status.
artifact_contract_output_type: deferred-item-audit
artifact_contract_required_data:
  - each unresolved item
  - the explicit mark that would close it
artifact_contract_verified_by: every item without an explicit resolved mark was surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Treat an unmarked item as open
every other entry — including one with no status: field at all — is UNRESOLVED and must be surfaced (fail-safe: never silently drop a possibly-open item).
<!-- vpmodule:atom:end treat-an-unmarked-item-as-open -->
<!-- vpmodule:atom:begin verify-that-every-deferral-has-a-destination -->
---
instruction_id: verify-that-every-deferral-has-a-destination
title: Verify that every deferral has a destination
summary: A deferral that names a destination that does not exist is a scope that was dropped without a home.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: The artifacts defer work to a later part of the work.
conditions_does_not_apply_when: No artifact defers anything.
artifact_contract_output_type: deferral-check
artifact_contract_required_data:
  - the deferral
  - the destination it names
  - the check that the destination exists
artifact_contract_verified_by: every deferral names a destination that exists
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Verify that every deferral has a destination
For each match, extract the referenced phase number.
Cross-reference against
flag as deferred scope not captured.
<!-- vpmodule:atom:end verify-that-every-deferral-has-a-destination -->