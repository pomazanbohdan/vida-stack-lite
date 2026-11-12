---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-existing-codebases-theory-of-project-context-md-7f06e8ae-c01"
title: "bmad-method: docs/existing-codebases/theory-of-project-context.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/existing-codebases/theory-of-project-context.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/existing-codebases/theory-of-project-context.md\"}"
atom_ids:
  - point-at-the-other-documents-instead-of-copying-them
  - separate-implementation-context-from-planning-context
atom_count: 2
atoms: "[{\"atom_id\":\"point-at-the-other-documents-instead-of-copying-them\",\"file_sha256\":\"ff420055b2ada71fed9b7a28f8a9b397aba4ee1de2fb1ace7873e63859875244\",\"content_sha256\":\"aa422931d556f49a2f37bea59ecce0d748871cbc82d8a5abba353b28586ca747\",\"file_bytes\":1956,\"body_bytes\":368},{\"atom_id\":\"separate-implementation-context-from-planning-context\",\"file_sha256\":\"43beef9b1214f4a5651ad55dbac52540f90b184ec27aafa686d27d2eb3b25929\",\"content_sha256\":\"959d2b35c52bdbf26769ceae58a31235910591479e79bc863694f02f3b58ef24\",\"file_bytes\":1811,\"body_bytes\":650}]"
carrier_sha256: 334fe176867c2c288ecb46a1a192cbaa7d3be7c443de7992183c71bc24495b8d
carrier_bytes: 4092
revision: 1
status: active
---
<!-- vpmodule:atom:begin point-at-the-other-documents-instead-of-copying-them -->
---
instruction_id: point-at-the-other-documents-instead-of-copying-them
title: Point at the other documents instead of copying them
summary: "Keep the tables, diagrams, glossaries and finished documents beside the contract and point at them, so one copy of each fact stays; a pointer to a standards document the team already maintains beats copying it."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "A contract is written beside tables, diagrams, glossaries and documents other work already produced."
conditions_does_not_apply_when: The contract is the only document and nothing else exists to point at.
artifact_contract_output_type: referenced-contract
artifact_contract_required_data:
  - the companion documents
  - the pointers
  - the copied text left out
artifact_contract_verified_by: every companion document is referenced and none of its content is copied into the contract
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/define-requirements-and-a-specification.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Point at the other documents instead of copying them
Tables, diagrams, glossaries, and documents other skills already wrote sit beside it; the spec points at them rather than copying them.
A paraphrase adds a second copy that goes stale while the original stays true.
or a pointer to a standards document the team already maintains, which is better than copying it.
<!-- vpmodule:atom:end point-at-the-other-documents-instead-of-copying-them -->
<!-- vpmodule:atom:begin separate-implementation-context-from-planning-context -->
---
instruction_id: separate-implementation-context-from-planning-context
title: Separate implementation context from planning context
summary: "Keep the constraints, commands, conventions and pitfalls in the code repository, and the rationale, rejected approaches and ownership in the project."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: Context has to serve both coding sessions and planning work.
conditions_does_not_apply_when: Only one of the two kinds of work is in scope.
artifact_contract_output_type: context-split
artifact_contract_required_data:
  - the implementation context
  - the planning context
  - where each lives
artifact_contract_verified_by: each kind of context sits in the artifact that is checked against it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Separate implementation context from planning context
One artifact cannot serve both coding and planning work.
**Implementation context** — constraints, commands, conventions, pitfalls — belongs to a **code repository**: checkable against the code, stale on every commit, loaded on every session, so it must be tiny.
**Planning context** — rationale, rejected approaches, ownership, domain meaning, org standards — belongs to a **project or initiative**: traceable only to source documents, stale in months rather than hours, consulted in bursts rather than loaded continuously.
That is a different capability, and it is coming separately.
<!-- vpmodule:atom:end separate-implementation-context-from-planning-context -->