---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-summary-compact-md-29f6ae79-c01"
title: "gsd-core: gsd-core/templates/summary.compact.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/summary.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/summary.compact.md\"}"
atom_ids:
  - auto-pass-a-deliverable-only-on-a-passing-verification
  - write-a-substantive-one-line-outcome-not-a-status
atom_count: 2
atoms: "[{\"atom_id\":\"auto-pass-a-deliverable-only-on-a-passing-verification\",\"file_sha256\":\"5d02455b2f3ecf95ec15e4eb101650f368911da22e6f565f42f81a900cb4a64f\",\"content_sha256\":\"af68dbf33cf1f955f10e5f10f946af49b7fb038a5e547a80f3e1f29b45c05d5d\",\"file_bytes\":1641,\"body_bytes\":407},{\"atom_id\":\"write-a-substantive-one-line-outcome-not-a-status\",\"file_sha256\":\"31dd5542404e534c74ba628d646b035d3c050008380e110deb1e38de675001e4\",\"content_sha256\":\"fcbd4d6229af473451eb322b7fbfc2d1fe2940fc06074ebf526b2bbc04c77de0\",\"file_bytes\":1340,\"body_bytes\":244}]"
carrier_sha256: cede20b3c4601e8ccd80a9f5ff6199c6b00f874672dd9bc57a641f8cc303f519
carrier_bytes: 3302
revision: 1
status: active
---
<!-- vpmodule:atom:begin auto-pass-a-deliverable-only-on-a-passing-verification -->
---
instruction_id: auto-pass-a-deliverable-only-on-a-passing-verification
title: Auto-pass a deliverable only on a passing verification
summary: A deliverable skips the human only when it carries a passing verification; everything else is put to a human.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A deliverable is classified for acceptance.
conditions_does_not_apply_when: The deliverable is already confirmed by a human.
artifact_contract_output_type: coverage-classification
artifact_contract_required_data:
  - the verification entries and their status
  - the judgment flag
artifact_contract_verified_by: the deliverable auto-passes only with a non-empty verification whose every status is pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Auto-pass a deliverable only on a passing verification
A deliverable auto-passes (no human prompt) **only** when `human_judgment: false` AND `verification` is non-empty AND every `verification[].status` is `pass`. This is the narrow, fully-proven case.
**Everything else is presented to a human** — `human_judgment: true`, an empty `verification:`, any non-`pass`/`unknown` status, or any schema error.
<!-- vpmodule:atom:end auto-pass-a-deliverable-only-on-a-passing-verification -->
<!-- vpmodule:atom:begin write-a-substantive-one-line-outcome-not-a-status -->
---
instruction_id: write-a-substantive-one-line-outcome-not-a-status
title: "Write a substantive one-line outcome, not a status"
summary: "The one-line outcome says what shipped; \"phase complete\" says nothing."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The outcome of a piece of work is summarised.
conditions_does_not_apply_when: The summary is a longer document.
artifact_contract_output_type: outcome-one-liner
artifact_contract_required_data:
  - the one line that says what shipped
artifact_contract_verified_by: the one line names what shipped instead of a status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write a substantive one-line outcome, not a status
The one-liner MUST be substantive:
The one-liner should tell someone what actually shipped.
**[Substantive one-liner describing outcome - NOT "phase complete" or "implementation finished"]**
<!-- vpmodule:atom:end write-a-substantive-one-line-outcome-not-a-status -->