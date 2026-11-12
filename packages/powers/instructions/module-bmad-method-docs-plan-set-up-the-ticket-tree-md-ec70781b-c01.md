---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-set-up-the-ticket-tree-md-ec70781b-c01"
title: "bmad-method: docs/plan/set-up-the-ticket-tree.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:docs/plan/set-up-the-ticket-tree.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/set-up-the-ticket-tree.md\"}"
atom_ids:
  - give-shared-setup-one-owner-the-earliest-item
  - keep-the-unsettled-in-the-notes-and-mark-it
  - the-local-record-is-the-working-copy-the-remote-is-pulled-back
atom_count: 3
atoms: "[{\"atom_id\":\"give-shared-setup-one-owner-the-earliest-item\",\"file_sha256\":\"41fb7e3f17a5491889d469f33409c21b6e512f3331be701730a4925943af7961\",\"content_sha256\":\"10dc830efe1ae4206d3820698a283ea3856260db32aa2cc11773196a259cdf40\",\"file_bytes\":1608,\"body_bytes\":348},{\"atom_id\":\"keep-the-unsettled-in-the-notes-and-mark-it\",\"file_sha256\":\"0622ed894c0b9ec3b4f453fe881236130a1396b91cd2197810b78c410d28ce83\",\"content_sha256\":\"3de96967e222f174901a850e920c310617e8ff4761ed44fc6e8146638e98b815\",\"file_bytes\":2329,\"body_bytes\":926},{\"atom_id\":\"the-local-record-is-the-working-copy-the-remote-is-pulled-back\",\"file_sha256\":\"b5965c569fa207ece19be54ea960ae23a3bba6422df5f6f136f87d27caad6628\",\"content_sha256\":\"71b71665f126964abec99d5066373f48f345a28034ebef94f20a2534324eb0ae\",\"file_bytes\":2045,\"body_bytes\":592}]"
carrier_sha256: 8c6bd069820e50019edc5c9ef04b4549d89c9cedd277eb47e89a311144c59c9c
carrier_bytes: 6455
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-shared-setup-one-owner-the-earliest-item -->
---
instruction_id: give-shared-setup-one-owner-the-earliest-item
title: "Give shared setup one owner, the earliest item"
summary: "Whatever more than one item needs — the harness, the scaffold, the schema, a shared component or an integration — has one owner: the earliest item that needs it."
capability_tags:
  - coordinate-program
pattern_tags:
  - single-source-of-truth
conditions_applies_when: More than one item needs the same setup.
conditions_does_not_apply_when: Each item needs its own setup.
artifact_contract_output_type: setup-ownership
artifact_contract_required_data:
  - the shared setup
  - its owner
  - the items that list it as a dependency
artifact_contract_verified_by: the shared setup has one owner and the other items list it as a dependency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/set-up-the-ticket-tree.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give shared setup one owner, the earliest item
Shared setup: whatever more than one item needs (test harness, scaffold, schema, a shared component or contract, an integration) has one owner, the earliest item that needs it, and the others list it in `after`.
If you decline, each becomes a story in the opening epic that the other epics wait on.
<!-- vpmodule:atom:end give-shared-setup-one-owner-the-earliest-item -->
<!-- vpmodule:atom:begin keep-the-unsettled-in-the-notes-and-mark-it -->
---
instruction_id: keep-the-unsettled-in-the-notes-and-mark-it
title: Keep the unsettled in the notes and mark it
summary: "A gap becomes an open question and a choice becomes a marked assumption, in the notes of the item, and never a silent guess."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A work item is being drafted and something is still unsettled.
conditions_does_not_apply_when: Everything the item depends on is already settled and recorded.
artifact_contract_output_type: marked-notes
artifact_contract_required_data:
  - each gap marked as an open question
  - each choice marked as an assumption
  - the decision that closes it
artifact_contract_verified_by: no gap and no choice is left unmarked or resolved by guessing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/set-up-the-ticket-tree.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the unsettled in the notes and mark it
Gaps become open questions in Notes and choices become marked assumptions, never silent guesses.
Notes holds what is not in the repo or the source and what is unsettled, each line marked, and only what is local to this ticket.
Anything touching more than one ticket lives in the parent's Notes and is referenced
`Assumption:` — offer each; confirmed, it becomes a dated decision; corrected, the ticket changes.
`Open question:` — answering it is part of the ticket's work when it starts.
`Unknown:` — it gates the start, and `tickets.py next` lists the ticket under `blocked` while the line is there; settle it with the user before the build begins, as a dated decision.
Never resolve any of them by guessing.
When something must be settled before implementation, the skill asks you to answer it or records it as the entry's `unknown`.
It adds a spike when you ask for one.
<!-- vpmodule:atom:end keep-the-unsettled-in-the-notes-and-mark-it -->
<!-- vpmodule:atom:begin the-local-record-is-the-working-copy-the-remote-is-pulled-back -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/set-up-the-ticket-tree.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# The local record is the working copy, the remote is pulled back
The tree is the working copy and a tracker is its remote; nothing syncs on its own. After every `write`, and after the `query` that precedes a board view, put what the tracker holds into the tree with `tickets.py mirror [<folder>]`.
A body that differs from the file: show both and ask.
With a tracker, the markdown files remain the working copy and the tracker is where the team sees them.
The tracker's status is read into the story's file as `tracker_status`, so moving a card on the board never makes build skip planning.
<!-- vpmodule:atom:end the-local-record-is-the-working-copy-the-remote-is-pulled-back -->