---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-contexts-review-md-a527bc00-c01"
title: "gsd-core: gsd-core/contexts/review.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/contexts/review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/contexts/review.md\"}"
atom_ids:
  - confirm-the-good-parts-alongside-the-findings
  - trust-the-machine-derived-facts-instead-of-re-deriving-them
atom_count: 2
atoms: "[{\"atom_id\":\"confirm-the-good-parts-alongside-the-findings\",\"file_sha256\":\"53218dd8de219cc8f288e52d903a3e4b5f90615271f0b429b75ea5ad0429b1bc\",\"content_sha256\":\"479030ddf17a69c96bc71b1ce396e80a3cb15ea10773fa0819b7793745e1d300\",\"file_bytes\":1438,\"body_bytes\":225},{\"atom_id\":\"trust-the-machine-derived-facts-instead-of-re-deriving-them\",\"file_sha256\":\"7facf036f6a66d41744c59a95b72b8a3deb7a19ddd51bb52df1b7842e33e9136\",\"content_sha256\":\"dbc7c640bb6a7be59360ac5f791dbe689ef9e0e2f8511f896d557d1bcd945e3b\",\"file_bytes\":1411,\"body_bytes\":237}]"
carrier_sha256: a3c17bdcb01b3e3572338af29a1e4e2e816cc66fd6bd4e5c42e549eeda981dec
carrier_bytes: 3172
revision: 1
status: active
---
<!-- vpmodule:atom:begin confirm-the-good-parts-alongside-the-findings -->
---
instruction_id: confirm-the-good-parts-alongside-the-findings
title: Confirm the good parts alongside the findings
summary: "A review says what is correct as well as what has to change, and every finding is written as what is wrong, why it matters and how to fix it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is being written.
conditions_does_not_apply_when: The review is a list of defects with nothing that works.
artifact_contract_output_type: balanced-review
artifact_contract_required_data:
  - what the review confirms as correct
  - the shape of each finding
  - what the finding has to say
artifact_contract_verified_by: the review confirmed the good parts and each finding carries the three parts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/contexts/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives general review-writing rules but does not identify an engineering, design-ux, product, business, research, or operations domain."
---

# Confirm the good parts alongside the findings
- State what is correct as well as what needs change — confirm the good parts
- Each issue should be one to three sentences: what is wrong, why it matters, and how to fix it.
<!-- vpmodule:atom:end confirm-the-good-parts-alongside-the-findings -->
<!-- vpmodule:atom:begin trust-the-machine-derived-facts-instead-of-re-deriving-them -->
---
instruction_id: trust-the-machine-derived-facts-instead-of-re-deriving-them
title: Trust the machine-derived facts instead of re-deriving them
summary: Cross-module facts that a tool produced are taken as ground truth and rendered in their own section; they are not recomputed by hand.
capability_tags:
  - verify-work-results
pattern_tags:
  - trust-graded-context
conditions_applies_when: A report has to carry cross-module facts that a tool already produced.
conditions_does_not_apply_when: The facts were produced by the reader itself.
artifact_contract_output_type: machine-derived-facts
artifact_contract_required_data:
  - the tool that produced the facts
  - the section they are rendered in
  - what is not recomputed
artifact_contract_verified_by: the machine-derived facts were used as given and not recomputed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/contexts/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Trust the machine-derived facts instead of re-deriving them
- Treat as ground truth for cross-module facts; do not re-derive.
- Render in REVIEW.md under `## Structural Findings (fallow)` as a separate section from narrative findings.
<!-- vpmodule:atom:end trust-the-machine-derived-facts-instead-of-re-deriving-them -->