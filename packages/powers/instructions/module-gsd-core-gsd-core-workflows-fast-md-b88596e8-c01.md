---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-fast-md-b88596e8-c01"
title: "gsd-core: gsd-core/workflows/fast.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/fast.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/fast.md\"}"
atom_ids:
  - check-the-task-is-trivial-before-you-start
  - report-done-without-next-step-suggestions
atom_count: 2
atoms: "[{\"atom_id\":\"check-the-task-is-trivial-before-you-start\",\"file_sha256\":\"be9a641f4be43562793183cbec2169436a5911867f9c9168e5dfe3ab7cefe0a7\",\"content_sha256\":\"600e9452b9d1141ab98fe2050069a05fc2b247a1fc7a77190fdbc883fe2a4508\",\"file_bytes\":1678,\"body_bytes\":520},{\"atom_id\":\"report-done-without-next-step-suggestions\",\"file_sha256\":\"2f19965464ca1df3c15402e18dcf3c802f1786aa8a36c86ac9a36f87b4c53395\",\"content_sha256\":\"97c1f8d86eed5f64bdc5bd5087b96d9c211e9cc8bd46216ef742dfad66c90ef4\",\"file_bytes\":1112,\"body_bytes\":121}]"
carrier_sha256: 97290085a5da17df031e72a339796770e3f49aea7eafbb18e70a4feae89147fd
carrier_bytes: 3071
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-task-is-trivial-before-you-start -->
---
instruction_id: check-the-task-is-trivial-before-you-start
title: Check the task is trivial before you start
summary: "The trivial route checks its own premise before it starts: a task over a few edits, a minute, a new dependency or an open research question belongs to the planning route."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A task is small enough that the trivial route was chosen for it.
conditions_does_not_apply_when: The task was already routed to a planning route.
artifact_contract_output_type: trivial-route-decision
artifact_contract_required_data:
  - the checks that were made
  - the decision to continue or to route away
  - the way the work was done
artifact_contract_verified_by: no agent was spawned and no planning artefact was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/fast.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Check the task is trivial before you start
**Before doing anything, verify this is actually trivial.**
A task is trivial if it can be completed in:
≤ 3 file edits
≤ 1 minute of work
No new dependencies or architecture changes
No research needed
If the task seems non-trivial (multi-file refactor, new feature, needs research), say:
NEVER spawn a Task/subagent — this runs inline
NEVER create PLAN.md or SUMMARY.md files
NEVER run research or plan-checking
If you're unsure how to implement it, STOP and redirect
<!-- vpmodule:atom:end check-the-task-is-trivial-before-you-start -->
<!-- vpmodule:atom:begin report-done-without-next-step-suggestions -->
---
instruction_id: report-done-without-next-step-suggestions
title: Report done without next-step suggestions
summary: "The trivial route ends with what changed, the commit and the files, and no next steps and no routing."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The trivial route finished the work.
conditions_does_not_apply_when: The work went through a planning route.
artifact_contract_output_type: completion-report
artifact_contract_required_data:
  - what was changed
  - the commit
  - the changed files
artifact_contract_verified_by: the report carries no next steps and no routing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/fast.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Report done without next-step suggestions
Report completion:
No next-step suggestions. No workflow routing. Just done.
<!-- vpmodule:atom:end report-done-without-next-step-suggestions -->