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
revision: 2
---

# Show the owner the options for finishing the work
Check the tests before showing the menu.
Report the failures and stop: the menu comes after a green suite.
Detect the environment: normal repo, named-branch worktree, or detached HEAD.
A normal repo gets the standard three options.
A named-branch worktree gets the standard three options.
A detached HEAD gets two options, with no merge.
Present exactly: merge back locally.
Present exactly: push and create a pull request.
Present exactly: keep the branch as-is, to handle later.
Present the menu exactly as written, concise, with every option coming from the list.
Discarding the work happens only in response to an explicit request.
Wait for their answer.
The integration decision is theirs.
Integration is your human partner's decision. Present the menu and wait.
