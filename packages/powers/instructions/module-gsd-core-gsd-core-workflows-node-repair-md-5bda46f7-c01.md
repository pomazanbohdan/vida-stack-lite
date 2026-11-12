---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-node-repair-md-5bda46f7-c01"
title: "gsd-core: gsd-core/workflows/node-repair.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/node-repair.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/node-repair.md\"}"
atom_ids:
  - classify-a-failed-task-into-one-repair-strategy
  - keep-the-repair-decomposition-in-memory
atom_count: 2
atoms: "[{\"atom_id\":\"classify-a-failed-task-into-one-repair-strategy\",\"file_sha256\":\"bc5ff4cc302ab85ac34b8b9a171dd371830cb1386f027147fb0b04227e02b4ec\",\"content_sha256\":\"e7cbde596b5eb71a69821afb61da458ecc840a2ad6de20dec4e3e6d72bdfc327\",\"file_bytes\":2014,\"body_bytes\":830},{\"atom_id\":\"keep-the-repair-decomposition-in-memory\",\"file_sha256\":\"bc6fa7c8b3ba1861d637d74c0a026beffd869528040109e78d2b1aa3e0265d49\",\"content_sha256\":\"608b30590fd17a0f8a32b185a8c3b2bcdc35dbc8352f4bbf1fe14e4b6cce588d\",\"file_bytes\":1421,\"body_bytes\":297}]"
carrier_sha256: 40d0af8b26a87a13c70342bab6aed6022aae17d99f0aa221a855eb31072a9f1c
carrier_bytes: 3722
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-a-failed-task-into-one-repair-strategy -->
---
instruction_id: classify-a-failed-task-into-one-repair-strategy
title: Classify a failed task into one repair strategy
summary: "A failed verification is classified into exactly one of four repair strategies, each with the trigger that selects it and the output it produces."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A task has failed its verification and the failure has to be answered.
conditions_does_not_apply_when: The failure was already classified and the repair is running.
artifact_contract_output_type: repair-strategy
artifact_contract_required_data:
  - the strategy that was chosen
  - the trigger that selected it
  - the output the strategy produces
artifact_contract_verified_by: exactly one strategy is named and the reason for it is on the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/node-repair.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify a failed task into one repair strategy
Analyze the failure and choose exactly one repair strategy:
**RETRY** — The approach was right but execution failed. Try again with a concrete adjustment.
Use when: command error, missing dependency, wrong path, env issue, transient failure
**DECOMPOSE** — The task is too coarse. Break it into smaller verifiable sub-steps.
Use when: done-criteria covers multiple concerns, implementation gaps are structural
**PRUNE** — The task is infeasible given current constraints. Skip with justification.
Use when: prerequisite missing and not fixable here, out of scope, contradicts an earlier decision
**ESCALATE** — Repair budget exhausted, or this is an architectural decision
Use when: RETRY failed more than once with different approaches, or fix requires structural change
<!-- vpmodule:atom:end classify-a-failed-task-into-one-repair-strategy -->
<!-- vpmodule:atom:begin keep-the-repair-decomposition-in-memory -->
---
instruction_id: keep-the-repair-decomposition-in-memory
title: Keep the repair decomposition in memory
summary: A decomposed task is replaced in place by smaller sub-tasks; the plan on disk is not rewritten by the repair.
capability_tags:
  - debug-root-cause
pattern_tags:
  - implementation-planning
conditions_applies_when: A failed task is decomposed into smaller verifiable sub-tasks.
conditions_does_not_apply_when: The task was not decomposed and the plan on disk is being re-planned on purpose.
artifact_contract_output_type: decomposed-task
artifact_contract_required_data:
  - the sub-tasks that replaced the failed task
  - the verification each sub-task carries
artifact_contract_verified_by: the plan on disk is unchanged and every sub-task has a single verifiable outcome
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/node-repair.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the repair decomposition in memory
Never modify the plan on disk.
Replace the failed task inline with the sub-tasks
Sub-tasks must each have a single verifiable outcome
DECOMPOSE sub-tasks must be more specific than the original, not synonymous rewrites.
The sub-tasks live in memory only.
<!-- vpmodule:atom:end keep-the-repair-decomposition-in-memory -->