---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-ui-auditor-md-90e7b364-c01"
title: "gsd-core: agents/gsd-ui-auditor.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-ui-auditor.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-ui-auditor.md\"}"
atom_ids:
  - never-report-a-state-you-did-not-capture
  - record-a-partial-capture-as-a-partial-one
atom_count: 2
atoms: "[{\"atom_id\":\"never-report-a-state-you-did-not-capture\",\"file_sha256\":\"4d21a6933e07882132e90519144f2a8372c99b8fdf3a44130a01ff3a49db1bbc\",\"content_sha256\":\"d3842e13535cec1b84625660f5abb82ad2e27b90cb5052e651c67f8bfbe76cd6\",\"file_bytes\":1527,\"body_bytes\":271},{\"atom_id\":\"record-a-partial-capture-as-a-partial-one\",\"file_sha256\":\"87baa0ae06e9d21858f33049b4a4b6ac54ecc0b0775cdd91ccc39d19f31683a4\",\"content_sha256\":\"29adbd2da6258e1aafc4f3712a882d222864cf8f7bbab02e538b232a82aa4b1a\",\"file_bytes\":1327,\"body_bytes\":239}]"
carrier_sha256: 55cdeb1f013bd5ba768cd3a85defa972d507da745cd08120e51d0a0b7ea98d4e
carrier_bytes: 3131
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-report-a-state-you-did-not-capture -->
---
instruction_id: never-report-a-state-you-did-not-capture
title: Never report a state you did not capture
summary: An observation that was not made is never written down as observed; the findings that rest on it say they came from the code.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A report describes states that a capture step may or may not have produced.
conditions_does_not_apply_when: Every described state was captured.
artifact_contract_output_type: observation-report
artifact_contract_required_data:
  - the states that were captured
  - the findings that are code-derived
artifact_contract_verified_by: no state that was not captured appears as observed and the code-derived findings say so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/enable-ui-interaction-capture.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Never report a state you did not capture
**Never report an interaction state you did not capture** — key off or section skipped, interaction findings are code-derived and say so.
An interaction state that does not appear in that directory is not reported as observed
<!-- vpmodule:atom:end never-report-a-state-you-did-not-capture -->
<!-- vpmodule:atom:begin record-a-partial-capture-as-a-partial-one -->
---
instruction_id: record-a-partial-capture-as-a-partial-one
title: Record a partial capture as a partial one
summary: The capture outcome names what was captured and what failed; a partial capture is never recorded as a capture.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A collection step can produce some of its results and fail on others.
conditions_does_not_apply_when: The step either produces everything or produces nothing.
artifact_contract_output_type: capture-outcome
artifact_contract_required_data:
  - the outcome
  - the failed captures by name
artifact_contract_verified_by: "the outcome reads partial or not captured when any capture failed, and the failures are named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-ui-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Record a partial capture as a partial one
The block's last line is its outcome: `captured`, `PARTIAL` or `NOT captured`. Record `captured` only for the first; otherwise name the failed captures and score the visual pillars without them.
<!-- vpmodule:atom:end record-a-partial-capture-as-a-partial-one -->