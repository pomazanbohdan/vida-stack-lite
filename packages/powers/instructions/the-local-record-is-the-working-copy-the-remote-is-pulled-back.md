---
instruction_id: the-local-record-is-the-working-copy-the-remote-is-pulled-back
title: "The local record is the working copy, the remote is pulled back"
summary: "The local tree is the working copy and the remote is its copy of it; after every write and every query, what the remote holds is pulled back into the local record, and a body that differs is shown to the user."
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
  - working-copy-authority-policy
conditions_applies_when: A remote system holds copies of the work items.
conditions_does_not_apply_when: There is no remote copy.
artifact_contract_output_type: sync-record
artifact_contract_required_data:
  - what the remote holds
  - the change written back into the local record
artifact_contract_verified_by: what the remote holds was pulled back into the local record after every write and every query
compatibility_excludes:
  - treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/set-up-the-ticket-tree.md
status: active
revision: 4
---

# The local record is the working copy, the remote is pulled back
The tree is the working copy and a tracker is its remote; nothing syncs on its own. After every `write`, and after the `query` that precedes a board view, put what the tracker holds into the tree with `tickets.py mirror [<folder>]`.
A body that differs from the file: show both and ask.
With a tracker, the markdown files remain the working copy and the tracker is where the team sees them.
The tracker's status is read into the story's file as `tracker_status`, so moving a card on the board never makes build skip planning.
