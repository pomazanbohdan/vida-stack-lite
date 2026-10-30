---
instruction_id: present-integration-options
title: Show the owner the options for finishing the work
summary: "Present the exact menu for the detected environment, keep discard out of it, and wait for the owner's decision."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A completed change is ready for integration or closure.
conditions_does_not_apply_when: "The work is not finished, or integration has already happened and been verified."
artifact_contract_output_type: integration-options
artifact_contract_required_data:
  - check result
  - base branch
  - options
  - owner choice
artifact_contract_verified_by: a full test suite passes before and after integration
compatibility_excludes: []
compatibility_requires:
  - integrate-completed-work
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Show the owner the options for finishing the work
Check the tests before showing the menu.
Report the failures and stop: the menu comes after a green suite.
Detect the environment: normal repo, named-branch worktree, or detached HEAD.
**Normal repo and named-branch worktree — present exactly these 3 options:**
1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
**Detached HEAD — present exactly these 2 options:**
1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)
Present the menu exactly as written — concise, with every option coming from the list above.
Discarding the work happens only in response to an explicit request.
Wait for their answer; the integration decision is theirs.
