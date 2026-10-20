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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 1
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
