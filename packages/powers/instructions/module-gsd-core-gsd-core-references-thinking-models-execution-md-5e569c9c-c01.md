---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-thinking-models-execution-md-5e569c9c-c01"
title: "gsd-core: gsd-core/references/thinking-models-execution.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/thinking-models-execution.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/thinking-models-execution.md\"}"
atom_ids:
  - derive-the-implementation-from-the-task-not-from-the-nearest-example
  - make-the-decision-explicit-now-rather-than-deferring-it-to-runtime
atom_count: 2
atoms: "[{\"atom_id\":\"derive-the-implementation-from-the-task-not-from-the-nearest-example\",\"file_sha256\":\"9cd0f437d97f22a7ec8db6b7df80ea6f7c927303c365fbbaa14124d5b39c39cd\",\"content_sha256\":\"e3d31661ca75874f538bbd1e44b56105499e8ad1ff987c46c5e20c27f8506918\",\"file_bytes\":1640,\"body_bytes\":512},{\"atom_id\":\"make-the-decision-explicit-now-rather-than-deferring-it-to-runtime\",\"file_sha256\":\"7e494100956153fe067e91c017facb9b7ad2373858da9484362931f11aead79a\",\"content_sha256\":\"db8712f11b81c8ae36763685c63790ab30a34dfd2e60e2d6e3e6c2b33cd9da04\",\"file_bytes\":1742,\"body_bytes\":573}]"
carrier_sha256: 572b7a487f96d01fd7850bd33a280c49993fb12fd37f90b73c161f81e05b1c05
carrier_bytes: 3765
revision: 1
status: active
---
<!-- vpmodule:atom:begin derive-the-implementation-from-the-task-not-from-the-nearest-example -->
---
instruction_id: derive-the-implementation-from-the-task-not-from-the-nearest-example
title: "Derive the implementation from the task, not from the nearest example"
summary: A pattern is copied only when the task carries the same constraint that produced it.
capability_tags:
  - execute-plan
pattern_tags:
  - project-conventions-first
conditions_applies_when: An existing pattern in another file or phase looks like the thing to copy.
conditions_does_not_apply_when: The constraint behind the pattern is already the task constraint.
artifact_contract_output_type: pattern-decision
artifact_contract_required_data:
  - the constraint the pattern satisfies
  - the constraint of this task
artifact_contract_verified_by: the pattern was taken only when the constraint matched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-execution.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the implementation from the task, not from the nearest example
Before copying a pattern from another file or phase, decompose WHY that pattern exists: What constraint does it satisfy? Does your current task have the same constraint? If not, the pattern may be cargo cult. Build your implementation from the task's actual requirements, not from the nearest existing example. When in doubt, the plan's `<action>` steps define what to build -- derive the implementation from those, not from adjacent code.
<!-- vpmodule:atom:end derive-the-implementation-from-the-task-not-from-the-nearest-example -->
<!-- vpmodule:atom:begin make-the-decision-explicit-now-rather-than-deferring-it-to-runtime -->
---
instruction_id: make-the-decision-explicit-now-rather-than-deferring-it-to-runtime
title: Make the decision explicit now rather than deferring it to runtime
summary: "An ambiguous requirement gets a forcing function that settles it at build time, or it is recorded as an open decision."
capability_tags:
  - execute-plan
pattern_tags:
  - technical-debt
conditions_applies_when: An ambiguous requirement or an unclear integration point is met while implementing.
conditions_does_not_apply_when: The requirement is unambiguous.
artifact_contract_output_type: forced-decision
artifact_contract_required_data:
  - the decision
  - the mechanism that forces it
  - the recorded deviation when it cannot be forced
artifact_contract_verified_by: the decision is explicit at build time or recorded as an open decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-execution.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the decision explicit now rather than deferring it to runtime
When you encounter an ambiguous requirement or unclear integration point, create a forcing function that makes the decision explicit NOW rather than hiding it behind a TODO or runtime check. Examples: use a TypeScript `never` type to force exhaustive switches, add a build-time assertion for required config values, create an interface that forces callers to handle error cases. If a decision truly cannot be made at build time, document it as a `checkpoint:decision` deviation -- do not silently defer.
<!-- vpmodule:atom:end make-the-decision-explicit-now-rather-than-deferring-it-to-runtime -->