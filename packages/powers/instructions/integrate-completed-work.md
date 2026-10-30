---
instruction_id: integrate-completed-work
title: Integrate completed work under control
summary: "Run the full suite on the tree to be integrated, confirm the base branch, and execute only the option the owner chose."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A completed branch or isolated change awaits integration or closure.
conditions_does_not_apply_when: "The work is not finished, or integration has already happened and been verified."
artifact_contract_output_type: integration-decision
artifact_contract_required_data:
  - full check result
  - base branch
  - environment state
artifact_contract_verified_by: the full test suite passes after integration
compatibility_excludes: []
compatibility_requires:
  - clean-up-integration-workspace
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

# Integrate completed work under control
Verify tests, detect environment, present options, execute the choice, clean up.
Run the project's full test suite.
If tests fail, report the failures and stop.
The menu comes after a green suite.
Tests passed earlier this session? Run the suite on the tree you are about to integrate.
A green run only proves the tree it ran on.
The base branch is whatever this work forked from.
It is usually named in the plan, the conversation, or the branch's upstream.
If it is not already known, ask.
Confirm before merging: merging into the wrong base is expensive to undo.
The integration decision is your human partner's.
Do not assume they obviously want it merged.
Execute only the chosen option.
If tests fail on the merged result, stop and leave the worktree and branch in place.
Nothing has been pushed, so the merge is local and recoverable.
Once the merged result is green, delete the branch.
A failing merged result stops everything.
