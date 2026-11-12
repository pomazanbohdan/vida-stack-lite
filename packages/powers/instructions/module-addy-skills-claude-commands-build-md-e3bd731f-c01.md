---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-claude-commands-build-md-e3bd731f-c01"
title: "addy-skills: .claude/commands/build.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:.claude/commands/build.md."
source: "{\"donor\":\"addy-skills\",\"path\":\".claude/commands/build.md\"}"
atom_ids:
  - gate-the-whole-plan-on-one-approval
  - keep-per-task-commits-clean-and-reversible
  - require-a-written-spec-before-building
atom_count: 3
atoms: "[{\"atom_id\":\"gate-the-whole-plan-on-one-approval\",\"file_sha256\":\"2de19b29b841ce65ec4f866de54a1fe4321e540d486199faa3c814bc450464ed\",\"content_sha256\":\"1deb6cd80fd9be4d20285f070daf01ec10a0deb98fcca13f961705afb92ce50f\",\"file_bytes\":1957,\"body_bytes\":756},{\"atom_id\":\"keep-per-task-commits-clean-and-reversible\",\"file_sha256\":\"a57bbca9f6099f7234ecc65dfcf83851a8d4588932a9f6fe5fcc8c194299c02c\",\"content_sha256\":\"682851ede3e78996ada784f0b023006ad8f6cc1f71d79a15e7575061eb662d0d\",\"file_bytes\":2527,\"body_bytes\":1037},{\"atom_id\":\"require-a-written-spec-before-building\",\"file_sha256\":\"9465d840c005ea67c094a7e345ba94177aaf38d927a6003c066c6f3e91f996a3\",\"content_sha256\":\"32c80d8db74bf033ea47864f99b52eb66d5cc539836336b39178050ab2d64307\",\"file_bytes\":1436,\"body_bytes\":305}]"
carrier_sha256: 7be766f283cb66a7ce1041022a748e3524cf49132558f4cdbb679f37eb3e00bd
carrier_bytes: 6323
revision: 1
status: active
---
<!-- vpmodule:atom:begin gate-the-whole-plan-on-one-approval -->
---
instruction_id: gate-the-whole-plan-on-one-approval
title: Gate the whole plan on one approval
summary: "The whole plan is presented once, an unambiguous affirmative is required, and the autonomous run then removes the human stepping between tasks but not the verification."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A whole plan is about to run in one pass without a checkpoint between tasks.
conditions_does_not_apply_when: The owner already approved this plan in this conversation.
artifact_contract_output_type: approval-gate
artifact_contract_required_data:
  - the plan presented
  - the owner reply verbatim
  - the approval verdict
  - the preparatory commit of the plan
artifact_contract_verified_by: the plan ran only after an unambiguous affirmative
compatibility_excludes: []
compatibility_requires:
  - write-implementation-plan
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/build.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Gate the whole plan on one approval
Use this once a spec exists and you want to collapse plan + build into one run.
Present the full plan and wait for an unambiguous affirmative (e.g. "approve", "go", "yes").
Treat hedged responses ("looks reasonable", "I guess") as **not** approved.
This is the only human gate — after approval, run autonomously.
Note: autonomous mode is not faster *per task* — it runs the same test-driven loop — it only removes the human stepping *between* tasks.
It removes the manual stepping between tasks — **not** the verification.
Every task still earns a passing test and its own commit.
If you generated `tasks/plan.md`, commit it as a single preparatory commit now so it doesn't bleed into the first task's commit.
<!-- vpmodule:atom:end gate-the-whole-plan-on-one-approval -->
<!-- vpmodule:atom:begin keep-per-task-commits-clean-and-reversible -->
---
instruction_id: keep-per-task-commits-clean-and-reversible
title: Keep the per-task commits clean and reversible
summary: "The tree starts clean, each task stages only its own files, and one commit per task leaves every point a clean rollback."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run makes one commit per task and the working tree may hold unrelated work.
conditions_does_not_apply_when: The change is a single edit that gets no commit of its own.
artifact_contract_output_type: commit-sequence
artifact_contract_required_data:
  - the baseline state of the working tree
  - the files staged for each task
  - one commit per task
artifact_contract_verified_by: no commit carries files that another task did not touch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/build.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-01-clarify-and-route.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep the per-task commits clean and reversible
Establish a clean baseline.
Run `git status --porcelain`.
If there are uncommitted changes outside the expected planning artifacts (`SPEC.md`, `docs/SPEC.md`, `spec/*`, `tasks/plan.md`, `tasks/todo.md`), stop and ask the user to commit, stash, or confirm how to handle them.
Autonomous per-task commits must not absorb unrelated local work, or the clean-rollback guarantee breaks.
Stage only the files that task touched plus its task-status update — never `git add -A` blindly — and make one commit per task so any point is a clean rollback.

Does the current branch make sense for this intent — considering its name and recent history? If the tree is dirty or the branch is an obvious mismatch, HALT and ask the human before proceeding. If version control is unavailable, skip this check.

Stage task-related files individually (NEVER `git add .` or `git add -A`):
DO commit each fix atomically — one commit per finding, listing ALL modified file paths after the commit message.
<!-- vpmodule:atom:end keep-per-task-commits-clean-and-reversible -->
<!-- vpmodule:atom:begin require-a-written-spec-before-building -->
---
instruction_id: require-a-written-spec-before-building
title: Require a written spec before building
summary: A build starts only from a spec file at a known path; a README is not a spec and requirements are never invented.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A build is about to start and the requirements live in a document.
conditions_does_not_apply_when: "The work is a change with no spec to write, such as a fix that already has a failing test."
artifact_contract_output_type: spec-gate
artifact_contract_required_data:
  - the path the spec was looked for at
  - the spec that was found
  - the reason the build may continue
artifact_contract_verified_by: the build starts from a spec file that exists at a known path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/build.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Require a written spec before building
Require a spec.
Look only for a spec at a known path: `SPEC.md` at the repo root, `docs/SPEC.md`, or a file under `spec/`.
A README or arbitrary doc does **not** count.
If none exists, stop and tell the user to run
the spec step first.
Do not invent requirements.
<!-- vpmodule:atom:end require-a-written-spec-before-building -->