---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-board-md-d3bd8473-c01"
title: "bmad-method: skills/bmad-agent-po/references/board.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-agent-po/references/board.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/board.md\"}"
atom_ids:
  - drop-only-after-a-recorded-reason
  - mark-waiting-on-a-person-as-blocked-with-a-reason
  - progress-lives-on-the-items-not-in-a-separate-status-file
  - publish-parents-before-children
  - resolve-a-named-item-through-the-resolver
  - resolve-drift-by-making-the-two-records-equal
atom_count: 6
atoms: "[{\"atom_id\":\"drop-only-after-a-recorded-reason\",\"file_sha256\":\"44beeb19a8619724dfb548086c26b42572add4f8fdff31dbb8d2a655a3178997\",\"content_sha256\":\"437b6de8594b1dfaa3ddd8968d8ed62f8ace2a944b275cc368b4d8f50fc0c7d2\",\"file_bytes\":1612,\"body_bytes\":424},{\"atom_id\":\"mark-waiting-on-a-person-as-blocked-with-a-reason\",\"file_sha256\":\"c91ceea4db3380a155ed5bc56ad7af033c55f7e165cfab1afd054c9a98c79f99\",\"content_sha256\":\"6d6ba67a81522969aa550d57b8dd5934fd88fafbd68ed525bb25bbe5aa76d4d8\",\"file_bytes\":1457,\"body_bytes\":232},{\"atom_id\":\"progress-lives-on-the-items-not-in-a-separate-status-file\",\"file_sha256\":\"f00e6d2f9c297fbadfa3489590b20a41a3bfbc415e6819350a52716592e07140\",\"content_sha256\":\"637bb193b62d3d7a79b3a71b31de6a4ac1ea0b266dbf8f4026856f06c183b96f\",\"file_bytes\":1486,\"body_bytes\":346},{\"atom_id\":\"publish-parents-before-children\",\"file_sha256\":\"70090734a887e4565c223fa0187cce7fc5754a1c21b4f490ddf5f725319bc4a9\",\"content_sha256\":\"55578abe52481c0eb905b2d12f2d8baf95da4421fb081e217bb7ec6ae110f24b\",\"file_bytes\":1244,\"body_bytes\":183},{\"atom_id\":\"resolve-a-named-item-through-the-resolver\",\"file_sha256\":\"a9baefcf7cb8eb6f340f2a013c124250c64571645c9f92879a8c17c8023a71b6\",\"content_sha256\":\"9cc52ba78c4859e9205d3e797edded057f151c2124b1d60c00ae5e7298285753\",\"file_bytes\":1597,\"body_bytes\":484},{\"atom_id\":\"resolve-drift-by-making-the-two-records-equal\",\"file_sha256\":\"ba651fa8a24f22af3a123dff38227c733cfc9e860c1866f4ef94008abed455bd\",\"content_sha256\":\"7dfa591b4094dac97a6a8ff7b3a97d483b2617e82424e16ad34b4002bf670fa0\",\"file_bytes\":1183,\"body_bytes\":176}]"
carrier_sha256: 02541ba926bf10bd158dd56bd432de2cfe882bcf280f40563a86aa3e6ae935d3
carrier_bytes: 9438
revision: 1
status: active
---
<!-- vpmodule:atom:begin drop-only-after-a-recorded-reason -->
---
instruction_id: drop-only-after-a-recorded-reason
title: Drop only after a recorded reason
summary: "An item is dropped only after a line says why, and the items that still wait on it are repointed."
capability_tags:
  - plan-implementation
pattern_tags:
  - decision-trail
conditions_applies_when: A work item is to be dropped.
conditions_does_not_apply_when: The item is being closed as done.
artifact_contract_output_type: drop-record
artifact_contract_required_data:
  - the reason it was dropped
  - where the reason is recorded
  - the items that still wait on it
artifact_contract_verified_by: the reason is recorded before the item is dropped and the items that wait on it are repointed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/spec-phase-edge-completeness-probe.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Drop only after a recorded reason
Drop only after a `Dropped:` line says why: in the ticket's Notes, or in its epic's Notes when the ticket has no file.
A dropped ticket still blocks what waits on it, in any epic: `status` lists them under `blocks`; remove or repoint it in each one's `after` with the user.
A `dismissed` resolution MUST require a non-empty reason.
Recorded with its reason; empty dismissals are rejected
<!-- vpmodule:atom:end drop-only-after-a-recorded-reason -->
<!-- vpmodule:atom:begin mark-waiting-on-a-person-as-blocked-with-a-reason -->
---
instruction_id: mark-waiting-on-a-person-as-blocked-with-a-reason
title: "Mark waiting on a person as blocked, with a reason"
summary: "An item that waits for a person or an answer — not for a prerequisite — is marked blocked with the reason and the date it started waiting, and the reason is cleared when it moves."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A work item waits for a person or an answer rather than for a prerequisite.
conditions_does_not_apply_when: The item waits for another item to finish.
artifact_contract_output_type: blocked-record
artifact_contract_required_data:
  - the reason the item waits
  - the date it started waiting
  - the status it keeps while it waits
artifact_contract_verified_by: "the item carries a blocked reason and a date, and the reason is cleared when it moves"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Mark waiting on a person as blocked, with a reason
Waiting on a person or an answer, not on a prerequisite,
`--blocked <reason>` sets `blocked_at` (today) and `blocked_reason`
a `mark` without it clears both when the ticket moves
<!-- vpmodule:atom:end mark-waiting-on-a-person-as-blocked-with-a-reason -->
<!-- vpmodule:atom:begin progress-lives-on-the-items-not-in-a-separate-status-file -->
---
instruction_id: progress-lives-on-the-items-not-in-a-separate-status-file
title: "Progress lives on the items, not in a separate status file"
summary: "The progress of the work is read from the items themselves, grouped by what can happen next, with what each item blocks and the counts by state."
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The state of the work has to be reported.
conditions_does_not_apply_when: The state is being set for the first time.
artifact_contract_output_type: progress-report
artifact_contract_required_data:
  - the items and their state
  - what each item blocks
  - the counts by state
artifact_contract_verified_by: the report comes from the items themselves and not from a separate status file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Progress lives on the items, not in a separate status file
Progress lives on tickets, not in a separate sprint or status file.
`tickets.py next [<folder>]` groups the open tickets by what can happen next; `tickets.py status [<folder>]` reports every ticket with its `status`, `tracker_status`, and `state`, what it blocks, and counts by state.
<!-- vpmodule:atom:end progress-lives-on-the-items-not-in-a-separate-status-file -->
<!-- vpmodule:atom:begin publish-parents-before-children -->
---
instruction_id: publish-parents-before-children
title: Publish parents before children
summary: Every parent is created before its children and every prerequisite before what waits on it; a prerequisite that is still local joins the publication scope.
capability_tags:
  - plan-implementation
pattern_tags:
  - program-orchestration
conditions_applies_when: Work items are published to a remote system.
conditions_does_not_apply_when: Nothing is published.
artifact_contract_output_type: publication-order
artifact_contract_required_data:
  - the order
  - the items that join the publication scope
artifact_contract_verified_by: every parent and every prerequisite was published before the item that waits on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Publish parents before children
Create parents before children, and a prerequisite before what waits on it.
A prerequisite that is still local joins the proposed publication scope.
<!-- vpmodule:atom:end publish-parents-before-children -->
<!-- vpmodule:atom:begin resolve-a-named-item-through-the-resolver -->
---
instruction_id: resolve-a-named-item-through-the-resolver
title: Resolve a named item through the resolver
summary: "An item the user names is found through the tool's own lookup before anything is done to it, and the item is read before it is changed."
capability_tags:
  - plan-implementation
pattern_tags:
  - evidence-analysis
conditions_applies_when: The user names a work item and it has to be found.
conditions_does_not_apply_when: The item is already in hand.
artifact_contract_output_type: resolved-item
artifact_contract_required_data:
  - the reference the user gave
  - the item it resolved to
  - the question asked when more than one fits
artifact_contract_verified_by: "the item was resolved by the tool's own lookup and read before it was acted on"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Resolve a named item through the resolver
A ticket the user names — "refine 1.2", "start ABCD-13", "build the cart service scaffold" — resolves through `tickets.py find [<folder>] <ref>` before you pull, review, refine, start, or mark it.
When the user's words are looser than that, read `status` and pick the ticket yourself, asking when more than one fits.
Read an existing ticket before changing it; if it has been published to a tracker, query its current remote state too.
<!-- vpmodule:atom:end resolve-a-named-item-through-the-resolver -->
<!-- vpmodule:atom:begin resolve-drift-by-making-the-two-records-equal -->
---
instruction_id: resolve-drift-by-making-the-two-records-equal
title: Resolve drift by making the two records equal
summary: "When the two records of one item disagree, both values are shown to the user and the records are made equal."
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Two records of the same work item disagree.
conditions_does_not_apply_when: The records agree.
artifact_contract_output_type: drift-resolution
artifact_contract_required_data:
  - both values
  - the change that makes them equal
artifact_contract_verified_by: the two values were shown to the user and made equal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resolve drift by making the two records equal
The leaf file's `after` or `hitl` differs from the entry's; the row gives both values
Show them to the user and make them equal
<!-- vpmodule:atom:end resolve-drift-by-making-the-two-records-equal -->