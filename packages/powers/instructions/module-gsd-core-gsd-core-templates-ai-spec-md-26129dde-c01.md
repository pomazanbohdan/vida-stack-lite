---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-ai-spec-md-26129dde-c01"
title: "gsd-core: gsd-core/templates/AI-SPEC.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/templates/AI-SPEC.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/AI-SPEC.md\"}"
atom_ids:
  - ground-the-evaluation-in-domain-expert-criteria
  - name-the-behaviours-that-must-never-go-wrong
  - record-the-alternatives-you-ruled-out-and-why
  - specify-the-reference-dataset-size-coverage-and-labelling
atom_count: 4
atoms: "[{\"atom_id\":\"ground-the-evaluation-in-domain-expert-criteria\",\"file_sha256\":\"8620feb2b54d5b47d74796850f088f95dd7eac25708ab1c104d11391a7fa2aaa\",\"content_sha256\":\"9c74877ce4560f76f5ea3785924443f9b1f77f70699845f04ec4d295f1543393\",\"file_bytes\":1500,\"body_bytes\":267},{\"atom_id\":\"name-the-behaviours-that-must-never-go-wrong\",\"file_sha256\":\"1267112d88b30415a394cbe7d990458c14acec40cc008327648b9f0650f47489\",\"content_sha256\":\"e9f5a33cd9114af7d72ab2a97b570d348ac0863979d2f68331939f51de546434\",\"file_bytes\":1212,\"body_bytes\":195},{\"atom_id\":\"record-the-alternatives-you-ruled-out-and-why\",\"file_sha256\":\"0474ebcf7640069e1e796c5567219b6b2bf010fbc123b5fefb734e6539d912a6\",\"content_sha256\":\"407cc9f4017e44f294c3d2f0dc616692e25f75caebc0c325b7c45e91bc3b34c0\",\"file_bytes\":1300,\"body_bytes\":203},{\"atom_id\":\"specify-the-reference-dataset-size-coverage-and-labelling\",\"file_sha256\":\"8eb3d7f675ba53bcd2d4d9598f91ba16bf73b27b8d92fe19dfe50cfa5eb9a968\",\"content_sha256\":\"ad9202afde9728731795417e4058b4587dcea83ab8e29e111099b1eca112e850\",\"file_bytes\":1446,\"body_bytes\":367}]"
carrier_sha256: 735558a07d49f8607fae7606ba4885cba7e979a1e38ef47a0c478a0a07cf7717
carrier_bytes: 6075
revision: 1
status: active
---
<!-- vpmodule:atom:begin ground-the-evaluation-in-domain-expert-criteria -->
---
instruction_id: ground-the-evaluation-in-domain-expert-criteria
title: Ground the evaluation in domain-expert criteria
summary: "The criteria are the ones a practitioner of the domain would use, in practitioner language."
capability_tags:
  - research-primary-sources
pattern_tags:
  - domain-language
conditions_applies_when: The evaluation strategy of an AI system is designed.
conditions_does_not_apply_when: The system has no domain-specific evaluation.
artifact_contract_output_type: evaluation-rubric
artifact_contract_required_data:
  - the criteria the domain experts use
  - the failure modes of this domain
artifact_contract_verified_by: the criteria are written in the language of the domain and name its failure modes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body contains rubric headings and incomplete label fragments only; it gives no full judgment rule, action sequence, or concrete list of checks to classify without supplying missing content."
---

# Ground the evaluation in domain-expert criteria
Domain-specific rubric ingredients — in practitioner language, not AI jargon
What Domain Experts Evaluate Against
Domain-specific failure modes from research — not generic hallucination, but how it manifests here
<!-- vpmodule:atom:end ground-the-evaluation-in-domain-expert-criteria -->
<!-- vpmodule:atom:begin name-the-behaviours-that-must-never-go-wrong -->
---
instruction_id: name-the-behaviours-that-must-never-go-wrong
title: Name the behaviours that must never go wrong
summary: The design contract names the handful of behaviours that absolutely cannot go wrong in this system.
capability_tags:
  - clarify-requirements
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A system design contract is written.
conditions_does_not_apply_when: The contract covers a change with no behaviour that can go wrong.
artifact_contract_output_type: critical-failure-modes
artifact_contract_required_data:
  - the behaviours that absolutely cannot go wrong
artifact_contract_verified_by: at least three critical failure modes are named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the behaviours that must never go wrong
**Critical Failure Modes:**
<!-- The 3-5 behaviors that absolutely cannot go wrong in this system -->
[ ] Critical failure modes identified (≥ 3)
<!-- vpmodule:atom:end name-the-behaviours-that-must-never-go-wrong -->
<!-- vpmodule:atom:begin record-the-alternatives-you-ruled-out-and-why -->
---
instruction_id: record-the-alternatives-you-ruled-out-and-why
title: Record the alternatives you ruled out and why
summary: "The frameworks that were not chosen are listed with the reason, and the lock-in that is accepted is written down on purpose."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A technology decision is written down.
conditions_does_not_apply_when: There was only one candidate.
artifact_contract_output_type: framework-decision
artifact_contract_required_data:
  - the chosen framework
  - the ruled-out alternatives with their reasons
  - the accepted lock-in
artifact_contract_verified_by: every ruled-out alternative carries its reason and the accepted lock-in is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Record the alternatives you ruled out and why
Alternatives Considered:
| Framework | Ruled Out Because |
**Vendor Lock-In Accepted:** <!-- Yes / No / Partial — document the trade-off consciously -->
<!-- vpmodule:atom:end record-the-alternatives-you-ruled-out-and-why -->
<!-- vpmodule:atom:begin specify-the-reference-dataset-size-coverage-and-labelling -->
---
instruction_id: specify-the-reference-dataset-size-coverage-and-labelling
title: "Specify the reference dataset: size, coverage and labelling"
summary: "A reference dataset is specified with its size, the scenario types it covers and who labels it."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: An evaluation strategy is written.
conditions_does_not_apply_when: The evaluation has no reference dataset.
artifact_contract_output_type: reference-dataset-spec
artifact_contract_required_data:
  - the size of the dataset
  - the scenario types it covers
  - who labels the examples and how
artifact_contract_verified_by: "the size, the composition and the labelling are all defined"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Specify the reference dataset: size, coverage and labelling
**Size:** <!-- e.g., 20 examples to start -->
<!-- What scenario types the dataset covers: critical paths, edge cases, failure modes -->
<!-- Who labels examples and how (domain expert, LLM judge with calibration, etc.) -->
[ ] Reference dataset spec written (size ≥ 10, composition + labeling defined)
<!-- vpmodule:atom:end specify-the-reference-dataset-size-coverage-and-labelling -->