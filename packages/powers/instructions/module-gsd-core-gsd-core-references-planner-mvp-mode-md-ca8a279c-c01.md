---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-mvp-mode-md-ca8a279c-c01"
title: "gsd-core: gsd-core/references/planner-mvp-mode.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-mvp-mode.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-mvp-mode.md\"}"
atom_ids:
  - record-the-deferred-scope-so-later-phases-do-not-re-litigate-it
  - require-each-task-to-move-the-user-facing-capability-forward
atom_count: 2
atoms: "[{\"atom_id\":\"record-the-deferred-scope-so-later-phases-do-not-re-litigate-it\",\"file_sha256\":\"52b89e0ad0ac0a612fa1e54c155c8e4c0696dac79b8e39dfbbbc34f5f7e18dc5\",\"content_sha256\":\"a142cc0ef8e39237c1cc505f6ca873395c08249c82d1f0fb28169600fd914b75\",\"file_bytes\":1691,\"body_bytes\":446},{\"atom_id\":\"require-each-task-to-move-the-user-facing-capability-forward\",\"file_sha256\":\"cb081dd2f8c33152ecd0b61020f83941518d53f5dafb2fa3c3bdf45549b85302\",\"content_sha256\":\"495283cd570efd7bba2d3acd958459783384e685d91c69afe4aed43ef04a7998\",\"file_bytes\":2056,\"body_bytes\":932}]"
carrier_sha256: 3b64b86012afdd4631975dc25ccb6129dc1568bacb9b1183cba432f89372bb71
carrier_bytes: 4108
revision: 1
status: active
---
<!-- vpmodule:atom:begin record-the-deferred-scope-so-later-phases-do-not-re-litigate-it -->
---
instruction_id: record-the-deferred-scope-so-later-phases-do-not-re-litigate-it
title: Record the deferred scope so later phases do not re-litigate it
summary: The architectural record names the decisions later phases build on and the scope that was deliberately left out.
capability_tags:
  - plan-implementation
pattern_tags:
  - frozen-intent
conditions_applies_when: The first slice of a new project fixes its architecture.
conditions_does_not_apply_when: The project already has an established architecture.
artifact_contract_output_type: skeleton-record
artifact_contract_required_data:
  - the architectural decisions
  - the deferred scope
  - the capability proven end to end
artifact_contract_verified_by: the record names the decisions and the deferred scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/skeleton-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Record the deferred scope so later phases do not re-litigate it
Anything that is *not* in the skeleton. Be explicit — this list prevents future phases from re-litigating Phase 1's minimalism
records the architectural decisions that subsequent phases will build on (chosen framework, DB, deployment target, auth approach, directory layout)
is the architectural backbone for every later vertical slice; treat it as a contract, not a scratchpad
<!-- vpmodule:atom:end record-the-deferred-scope-so-later-phases-do-not-re-litigate-it -->
<!-- vpmodule:atom:begin require-each-task-to-move-the-user-facing-capability-forward -->
---
instruction_id: require-each-task-to-move-the-user-facing-capability-forward
title: Require each task to move the user-facing capability forward
summary: Every task must leave a real user able to do more than before; a task that only lays a foundation is a horizontal task in disguise.
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: The tasks of a feature are written.
conditions_does_not_apply_when: The plan is the walking skeleton of a new project.
artifact_contract_output_type: slice-acceptance
artifact_contract_required_data:
  - the user-visible capability after each task
  - the slice the task opens
artifact_contract_verified_by: after each task a user can do something they could not do before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Require each task to move the user-facing capability forward
**Decompose by feature slice, not by technical layer.** Every task must move the user-facing capability forward. After each task, a real user can click through more of the feature than they could before
**Forbidden** under tracer-first:
- "Create the database schema" as a standalone task
- "Build the API layer" as a standalone task
- "Wire up the UI" as a final integration task
The leading `tracer` task produces a working end-to-end path — production-quality, not a prototype. Stubs are allowed ONLY where they can later be filled without an architectural change; the happy path must be real
**Acceptance Test for Your Plan**
Before emitting the plan, ask: **after Task N completes, can a real user *do* something they could not do after Task N-1?** If the answer is "no, but the foundation is laid", you have a horizontal task disguised as a slice. Restructure.
<!-- vpmodule:atom:end require-each-task-to-move-the-user-facing-capability-forward -->