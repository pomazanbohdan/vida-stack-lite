---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-artifact-types-md-3a90251a-c01"
title: "gsd-core: gsd-core/references/artifact-types.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/artifact-types.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/artifact-types.md\"}"
atom_ids:
  - declare-the-consumer-of-an-artifact
  - describe-a-lens-by-what-it-diagnoses-and-prescribes
atom_count: 2
atoms: "[{\"atom_id\":\"declare-the-consumer-of-an-artifact\",\"file_sha256\":\"812a9de45c9a07ddc9854e09a298f6d57806482db72310dc1b7907e703cfcca7\",\"content_sha256\":\"863a1c44b8cff5af5fadd7b73243aed1b4ae27f6483e250d9b65f6cb3ddb0ce4\",\"file_bytes\":1357,\"body_bytes\":283},{\"atom_id\":\"describe-a-lens-by-what-it-diagnoses-and-prescribes\",\"file_sha256\":\"951e4b52638bc2759a62d017a3c2d7c5d624330036c152ec023fe28e5cad984c\",\"content_sha256\":\"7dac3589b0bb6822f061238665f475af76e48eaa70f0d17e558ca3217071d93e\",\"file_bytes\":1436,\"body_bytes\":241}]"
carrier_sha256: 00e393c31dbacf495a622609a5fa2ca001feda6eb535350d1dd685f5ff954977
carrier_bytes: 3080
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-the-consumer-of-an-artifact -->
---
instruction_id: declare-the-consumer-of-an-artifact
title: Declare the consumer of an artifact
summary: "An artifact that nothing reads is inert; its meaning comes from the consumer that reads it, so the consumer is named."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - verified-loading
conditions_applies_when: An artifact is written that later work depends on.
conditions_does_not_apply_when: The artifact is a temporary file of this session.
artifact_contract_output_type: artifact-consumer
artifact_contract_required_data:
  - the artifact
  - the consumer that reads it
  - the point at which it is loaded
artifact_contract_verified_by: "a named consumer loads the artifact, and the artifact says what it is for"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/artifact-types.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Declare the consumer of an artifact
A well-formatted artifact that no workflow reads is inert — the consumption mechanism is what gives an artifact meaning.
The lenses only take effect when an agent loads them into its reasoning context before analysis.
Why consumption matters:
<!-- vpmodule:atom:end declare-the-consumer-of-an-artifact -->
<!-- vpmodule:atom:begin describe-a-lens-by-what-it-diagnoses-and-prescribes -->
---
instruction_id: describe-a-lens-by-what-it-diagnoses-and-prescribes
title: Describe a lens by what it diagnoses and what it prescribes
summary: "Every lens states the class of problem it detects, the class of response it prescribes and the conditions that trigger it."
capability_tags:
  - review-code
pattern_tags:
  - dimension-sweep
conditions_applies_when: A reusable lens is written for a method.
conditions_does_not_apply_when: A one-off check that is not meant to be reused.
artifact_contract_output_type: lens-definition
artifact_contract_required_data:
  - what the lens diagnoses
  - what it recommends
  - when it applies
artifact_contract_verified_by: "the lens names its diagnosis, its prescription and its trigger"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/artifact-types.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body defines reusable diagnostic-lens fields, but the lens subject is unspecified; no listed domain can be grounded from the body or conditions."
---

# Describe a lens by what it diagnoses and what it prescribes
Named lenses, each documenting:
What it diagnoses (the class of problem it detects)
What it recommends (the class of response it prescribes)
When to apply (triggering conditions)
<!-- vpmodule:atom:end describe-a-lens-by-what-it-diagnoses-and-prescribes -->