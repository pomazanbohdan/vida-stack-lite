---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-finishing-a-development-branch-skill-md-d5dbb16a-c01"
title: "superpowers: skills/finishing-a-development-branch/SKILL.md module"
summary: "Carrier for 4 atomic instructions from superpowers:skills/finishing-a-development-branch/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/finishing-a-development-branch/SKILL.md\"}"
atom_ids:
  - clean-up-integration-workspace
  - integrate-completed-work
  - present-integration-options
  - require-explicit-discard-confirmation
atom_count: 4
atoms: "[{\"atom_id\":\"clean-up-integration-workspace\",\"file_sha256\":\"05e666ba80fd5f9917646c5507b6967b7267d510466e67aa2cd0e3a13170ca4f\",\"content_sha256\":\"6bcfa70acbe5588243c07304528a63d519a4eedf1c0d9e2319dc1ba0fa7b6b63\",\"file_bytes\":2123,\"body_bytes\":1058},{\"atom_id\":\"integrate-completed-work\",\"file_sha256\":\"cbc3dc23491a7792ca4273ca339060d8786999639350b574df490c482b79c439\",\"content_sha256\":\"4d12ab13883d34a83d09665de91c60ff89d299a47f939ecc9f35d92573c5c858\",\"file_bytes\":2100,\"body_bytes\":976},{\"atom_id\":\"present-integration-options\",\"file_sha256\":\"c6a7ca98c56abee3ac873ec8d787d813bb97b6c03cddd935572e2919d1aab143\",\"content_sha256\":\"b22e577b66a5edf85605c163025d91a3d7a53d9f11df0dc5f149e969a94e6836\",\"file_bytes\":1922,\"body_bytes\":800},{\"atom_id\":\"require-explicit-discard-confirmation\",\"file_sha256\":\"1052f5e217ac96ee8f880e0b1a7f2c3c1354840ccbe7396b73642accb9a75949\",\"content_sha256\":\"92b71343521c6292ad6bee5e046cf483751b36321d65ad01e5774305dc9a510e\",\"file_bytes\":1950,\"body_bytes\":903}]"
carrier_sha256: b0facfebd570d66d3ed27283a2062fbd6cec085e292b12847ea5e2d3b45129f0
carrier_bytes: 8562
revision: 1
status: active
---
<!-- vpmodule:atom:begin clean-up-integration-workspace -->
---
instruction_id: clean-up-integration-workspace
title: Clean up only the workspace you own
summary: "Remove only worktrees created for this work, never force over unique files, and leave host-owned workspaces in place."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Integration is complete or the owner confirmed discarding the work.
conditions_does_not_apply_when: "The work was left for review, more work, or a deferred decision."
artifact_contract_output_type: workspace-cleanup
artifact_contract_required_data:
  - workspace owner
  - file state
  - cleanup performed
artifact_contract_verified_by: no unique files are removed without an explicit choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Clean up only the workspace you own
Cleanup runs for the local merge and for confirmed discards.
Push-and-create-PR and keep-as-is always preserve the worktree.
Worktree removal must run from outside the worktree.
If the repository is normal, there is no worktree to clean up.
If the worktree is under the managed worktrees directory, you own cleanup.
Remove the worktree and prune stale registrations.
If removal is refused, the worktree holds files that exist nowhere else.
Those may be uncommitted plans, notes, or scratch work.
Never force on your own initiative.
Show your human partner what is at stake and ask.
Ask whether to commit the files to the branch.
Ask whether to move them into the main repository root.
Ask whether to delete them, knowing that is unrecoverable.
Carry out the choice, then remove the worktree.
Otherwise the host environment owns this workspace; leave it in place.
If your platform provides a workspace-exit tool, use it.
Clean up only worktrees under the managed worktrees directory.
Everything else belongs to the host.
<!-- vpmodule:atom:end clean-up-integration-workspace -->
<!-- vpmodule:atom:begin integrate-completed-work -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 5
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
<!-- vpmodule:atom:end integrate-completed-work -->
<!-- vpmodule:atom:begin present-integration-options -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 5
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
<!-- vpmodule:atom:end present-integration-options -->
<!-- vpmodule:atom:begin require-explicit-discard-confirmation -->
---
instruction_id: require-explicit-discard-confirmation
title: Require explicit confirmation before deleting work
summary: "Offer deletion only on an explicit request, name everything that disappears, and wait for the typed confirmation word."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The owner asks to delete completed or abandoned work.
conditions_does_not_apply_when: The work is kept or integrated.
artifact_contract_output_type: discard-confirmation
artifact_contract_required_data:
  - scope of deletion
  - losses
  - exact confirmation
artifact_contract_verified_by: the confirmation matches the stated deletion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Require explicit confirmation before deleting work
Discarding the work happens only in response to your human partner explicitly asking for it.
This path exists only as a response to an explicit request to throw the work away.
Confirm first.
State that this will permanently delete the branch.
State all commits that will be deleted.
State the worktree path that will be deleted.
Ask them to type 'discard' to confirm.
Wait for that exact confirmation.
Only the typed word discard authorizes deletion.
"Yeah, get rid of it" does not count as confirmation.
Do not offer to discard because they seem done with the feature.
The menu is complete as written.
Discard happens only when your human partner asks for it in so many words.
When the confirmation arrives, change to the main repository root.
Clean up the worktree.
Then force-delete the branch.
Do not force-delete without the typed confirmation.
<!-- vpmodule:atom:end require-explicit-discard-confirmation -->