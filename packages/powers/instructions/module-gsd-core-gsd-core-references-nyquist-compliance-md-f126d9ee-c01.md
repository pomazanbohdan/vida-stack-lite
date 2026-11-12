---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-nyquist-compliance-md-f126d9ee-c01"
title: "gsd-core: gsd-core/references/nyquist-compliance.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/nyquist-compliance.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/nyquist-compliance.md\"}"
atom_ids:
  - reject-a-verify-command-that-never-terminates
  - require-an-automated-verification-command-for-every-task
  - require-an-automated-verify-in-every-run-of-tasks
atom_count: 3
atoms: "[{\"atom_id\":\"reject-a-verify-command-that-never-terminates\",\"file_sha256\":\"d48be4bddefb9b1e6608e49af6e0a367fd65c8c4c981f1a093b24032d5f46fb7\",\"content_sha256\":\"a69c2d645226ad5744a2740c0d9f96b0d6f1f3ff4763f20add15ed5d3c454692\",\"file_bytes\":1401,\"body_bytes\":274},{\"atom_id\":\"require-an-automated-verification-command-for-every-task\",\"file_sha256\":\"de128a27d77c9382830b415ccb357b7a9e9ed6bda3f4d735776a71eec631dad9\",\"content_sha256\":\"61e076c7ade9dd4ed260a53c80e60c801d737245b2bdc45eb9bff77e54ea3cc7\",\"file_bytes\":1801,\"body_bytes\":532},{\"atom_id\":\"require-an-automated-verify-in-every-run-of-tasks\",\"file_sha256\":\"97256d61cc5bfaa104b7e5663e93c3984e9c8f844f7a5dbfcc3674f26e29b395\",\"content_sha256\":\"71a6cf48e508d766beeee6406c2d165a3dcaca1ed41a5cc341a86d7e18acc5ef\",\"file_bytes\":1345,\"body_bytes\":217}]"
carrier_sha256: 908ad2ce9a451058e1a01886081db2d3d0bd85e0d0002c001960a8291458d9c4
carrier_bytes: 5020
revision: 1
status: active
---
<!-- vpmodule:atom:begin reject-a-verify-command-that-never-terminates -->
---
instruction_id: reject-a-verify-command-that-never-terminates
title: Reject a verify command that never terminates
summary: "A verification command in watch mode, or one that only runs the whole end-to-end suite, is a failing gate and not a measurement."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A plan names the command that verifies a task.
conditions_does_not_apply_when: The command is a focused test or build that terminates on its own.
artifact_contract_output_type: verify-command-ruling
artifact_contract_required_data:
  - the command
  - the flag that makes it non-terminating
  - the ruling
artifact_contract_verified_by: no watch-mode or full-suite command was accepted as the verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/nyquist-compliance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject a verify command that never terminates
For each `<automated>` command:
- Full E2E suite (playwright, cypress, selenium) → **WARNING** — suggest faster unit/smoke test
- Watch mode flags (`--watchAll`) → **BLOCKING FAIL**
- Delays > 30 seconds → **WARNING**
<!-- vpmodule:atom:end reject-a-verify-command-that-never-terminates -->
<!-- vpmodule:atom:begin require-an-automated-verification-command-for-every-task -->
---
instruction_id: require-an-automated-verification-command-for-every-task
title: Require an automated verification command for every task
summary: "Every task carries an automated verification command or a first task that creates the test; a watch-mode flag never terminates, a full end-to-end suite is too slow for the loop and the coverage of the tasks must not lapse."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan states what verifies each task.
conditions_does_not_apply_when: The verification of the phase is done by the phase-level check alone.
artifact_contract_output_type: verification-coverage
artifact_contract_required_data:
  - the automated command of every task
  - the wave coverage
  - the test that is created first
artifact_contract_verified_by: every task has a command that terminates and no run of tasks lacks a verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/nyquist-compliance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Require an automated verification command for every task
- `<verify>` must contain `<automated>` command, OR a Wave 0 dependency that creates the test first
- If `<automated>` is absent with no Wave 0 dependency
→ Critical
- Watch mode flags (`--watchAll`)
→ Critical
- Full E2E suite (playwright, cypress, selenium)
→ Minor
suggest faster unit/smoke test
- Delays > 30 seconds
→ Minor
Per wave, any consecutive window of 3 implementation tasks must have ≥2 with `<automated>` verify.
3 consecutive without
→ Critical
<!-- vpmodule:atom:end require-an-automated-verification-command-for-every-task -->
<!-- vpmodule:atom:begin require-an-automated-verify-in-every-run-of-tasks -->
---
instruction_id: require-an-automated-verify-in-every-run-of-tasks
title: Require an automated verify in every run of tasks
summary: "A run of consecutive implementation tasks without an automated verification fails; the run of tasks is checked, not the plan as a whole."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The tasks of a plan are mapped to the waves they run in.
conditions_does_not_apply_when: The phase has no plan with tasks.
artifact_contract_output_type: verification-coverage-report
artifact_contract_required_data:
  - the wave
  - the tasks in the run
  - the count that carry an automated verify
artifact_contract_verified_by: no run of three consecutive tasks is left without an automated verify
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/nyquist-compliance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Require an automated verify in every run of tasks
Map tasks to waves. Per wave, any consecutive window of 3 implementation tasks must have ≥2 with `<automated>` verify. 3 consecutive without → **BLOCKING FAIL**
<!-- vpmodule:atom:end require-an-automated-verify-in-every-run-of-tasks -->