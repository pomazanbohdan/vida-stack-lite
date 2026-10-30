---
instruction_id: merge-copied-tree-with-local-edits
title: Merge a copied tree with local edits
summary: "Refresh a copied workflow by mining only the history since its last edit, keeping rules the user has not contradicted and revising the ones with new evidence."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A copied or generated workflow already carries local edits and has to be refreshed.
conditions_does_not_apply_when: "No local edits exist yet, so the copy can simply be replaced."
artifact_contract_output_type: merged-copy
artifact_contract_required_data:
  - files to merge
  - preserved sections
  - revised sections
  - new evidence
artifact_contract_verified_by: "the project's checks passing after each merged file group"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/09-make-it-yours.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
  - research
---

# Merge a copied tree with local edits
Update mode mines only the history since the skill was last edited.
Edit the existing file in place.
Preserve sections the user hasn't contradicted.
Revise the ones with new evidence.
Add new sections only for genuinely new rules.
Run the update whenever habits drift, with everything since the last edit as the input.
Cross-check across slices before elevating a signal.
Patterns seen in two or more slices are high-confidence, and lone signals are weak and usually get dropped.
Require multiple instances before codifying a rule.
Show the draft to the user and take feedback.
Expect multiple iterations, and cut ruthlessly, because a mode skill is not a manual.
Keep it operational: restating other skills' contents, inventing metaphors, or writing poetic prose for an agent reader is cost without benefit.
Work in a worktree off main, commit, and open a PR, never pushing to main directly.
Test the changed skill blind before you trust it, because the eval catches the drift before it ships.
