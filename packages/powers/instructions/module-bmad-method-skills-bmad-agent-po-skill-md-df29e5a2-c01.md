---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-skill-md-df29e5a2-c01"
title: "bmad-method: skills/bmad-agent-po/SKILL.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-agent-po/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/SKILL.md\"}"
atom_ids:
  - approve-publish-and-start-are-three-separate-steps
  - assign-a-work-item-an-id-once-and-never-reuse-it
  - dispatch-sofia-by-what-the-user-says
  - facilitate-the-breakdown-and-let-the-user-decide
  - make-a-story-an-implementation-step-not-a-user-value-slice
  - mark-a-ticket-that-needs-a-person
  - use-the-recorded-state-instead-of-deriving-it
atom_count: 7
atoms: "[{\"atom_id\":\"approve-publish-and-start-are-three-separate-steps\",\"file_sha256\":\"952c24864fae369344a445da4f126a1984091962e2a7a71055b5e23c994f3bce\",\"content_sha256\":\"0a76cf7ed22fff6d6b960ba2fc2a607f4e4746d755d7eebd5d6f9d59dc788143\",\"file_bytes\":2682,\"body_bytes\":893},{\"atom_id\":\"assign-a-work-item-an-id-once-and-never-reuse-it\",\"file_sha256\":\"fd66c025211e0f27eb54317bdc2ff90ec4ec12ab3f30fa98d311a55c44760a4c\",\"content_sha256\":\"af33bd631c3579c988d2ac2900cbd96c8c9cde665644b42c52f66ab6dbbb1d53\",\"file_bytes\":2006,\"body_bytes\":629},{\"atom_id\":\"dispatch-sofia-by-what-the-user-says\",\"file_sha256\":\"e33af0af5319223a1fce7242409a38df0b1b1718b8c09131087157f6cb217c6d\",\"content_sha256\":\"4102b8e9b76d800846f402e50969c6cb4709659e942655416d08b176107a1a3b\",\"file_bytes\":2111,\"body_bytes\":796},{\"atom_id\":\"facilitate-the-breakdown-and-let-the-user-decide\",\"file_sha256\":\"ead91818830b9da60cd3e2ac5a303521f1dd265a948bbba2a9df38049b75a9a0\",\"content_sha256\":\"1f5ca06e43f8579e629e280e9ac3792bf71f0ef5f7700142afeabdcf765a04f6\",\"file_bytes\":1831,\"body_bytes\":633},{\"atom_id\":\"make-a-story-an-implementation-step-not-a-user-value-slice\",\"file_sha256\":\"2a56e47148e9b006babc773f5cc6e8f6b6c7e3cc7ba7ca47869b45fdaa9bf98e\",\"content_sha256\":\"82035ee413c56161d3d81357eb5121fdd6bd1e2873e75b1b06e0aca5f7005e23\",\"file_bytes\":1988,\"body_bytes\":579},{\"atom_id\":\"mark-a-ticket-that-needs-a-person\",\"file_sha256\":\"827c3af4534e94fb1c2ca7aa00825b243b9ecdef4d250177a649750029f37671\",\"content_sha256\":\"c5578acd70cd68de018d4ea3cf32efac6ca79b2bfd092451cc021b5db4a07676\",\"file_bytes\":1849,\"body_bytes\":449},{\"atom_id\":\"use-the-recorded-state-instead-of-deriving-it\",\"file_sha256\":\"c606c3e68089ccb313b963ba8fc05efc8bbdf7de7364626ed85caea775c274b7\",\"content_sha256\":\"69d5a191e0e78ad8a3a34e3c8a9c371518c4d12c5a3a41bc78e26b0db50c26eb\",\"file_bytes\":1977,\"body_bytes\":638}]"
carrier_sha256: 1f441bce2d11afbc7c6d79eea1646cdb78e036185181645307fa817e9d9647b1
carrier_bytes: 15485
revision: 1
status: active
---
<!-- vpmodule:atom:begin approve-publish-and-start-are-three-separate-steps -->
---
instruction_id: approve-publish-and-start-are-three-separate-steps
title: "Approve, publish, and start as three separate steps"
summary: "On the repo store, approval is the commit; on a tracker, publication is a separate approval, and starting the work is separate from both. None of them moves the status or the assignee."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A set of work items has been agreed and something is about to be published or started.
conditions_does_not_apply_when: The user asked for publication and the start in one request.
artifact_contract_output_type: approval-record
artifact_contract_required_data:
  - what was approved
  - the separate approvals still owed
  - the identity and status that were preserved
artifact_contract_verified_by: "the repo commit or the tracker publication and the start each carry their own approval"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone/steps/git-tag.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/cleanup.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Approve, publish, and start as three separate steps
Before publish, ask once which other validations to run unless already said, and still get a yes to publish unless they said to publish too.
A reply approves what was presented. On the repo store that yes is the commit to the tree; on a tracker the ticket stays in the tree until it is published, a separate approval per `board.md`.
Starting work is a separate yes from both, unless the user asks for them together.
None of these changes status or assignee: preserve identity and any existing `status`, `tracker_status`, and assignee.
Approving a breakdown records it in the epic's `tickets.toml`; it does not start work.
Creating the tag locally and pushing it to the remote are two separate steps: the push carries its own question.
A distinct action gets its own explicit question and must not be silently folded into another approval.
<!-- vpmodule:atom:end approve-publish-and-start-are-three-separate-steps -->
<!-- vpmodule:atom:begin assign-a-work-item-an-id-once-and-never-reuse-it -->
---
instruction_id: assign-a-work-item-an-id-once-and-never-reuse-it
title: Assign a work item an id once and never reuse it
summary: "An item's id is assigned once, is its only name, and is never given to another item — a move retires the old id, and neither a drop nor a move frees it for reuse."
capability_tags:
  - plan-implementation
pattern_tags:
  - stable-identity
conditions_applies_when: "A work item is created, moved, or dropped."
conditions_does_not_apply_when: The item already has its id and keeps it.
artifact_contract_output_type: work-item-identity
artifact_contract_required_data:
  - the id
  - the scope the id is unique in
  - the fact that the id is never given out again
artifact_contract_verified_by: the id is assigned once and no other item is ever given it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/ticket-tree-rules.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Assign a work item an id once and never reuse it
An entry's `id` is a number (or letters and digits, such as `6a`, when the work already has that id), assigned once and never reused.
It is the ticket's only name on the repo store: `3` inside its epic, `2.3` from another epic.
`tickets.py move` renumbers an entry when it moves to another parent; the old id is retired and never given out again, and every `after` naming it is rewritten.
An entry is never deleted from an approved `tickets.toml`, so its id is never reused.
That field joins the plan to its entry, so a title change that renames the plan never breaks the link.
<!-- vpmodule:atom:end assign-a-work-item-an-id-once-and-never-reuse-it -->
<!-- vpmodule:atom:begin dispatch-sofia-by-what-the-user-says -->
---
instruction_id: dispatch-sofia-by-what-the-user-says
title: Dispatch Sofia by what the user says, not a menu
summary: "Sofia is reached by naming her or by the work the user asks for; she dispatches on that phrase, speaks in ticket words, and never shows a menu."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - progressive-disclosure
conditions_applies_when: A request reaches Sofia the Product Owner.
conditions_does_not_apply_when: The request reaches another agent or a single skill directly.
artifact_contract_output_type: dispatched-request
artifact_contract_required_data:
  - the capability the request maps to
  - the ticket words used with the user
artifact_contract_verified_by: the request was dispatched to its capability without a menu, or greeted and left waiting when none fits
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/workflow.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Dispatch Sofia by what the user says, not a menu
Sofia is the Product Owner. The user reaches her by name ("ask Sofia", "the product owner") or by saying what they want: "create a spec", "distill this PRD", "slice this", "split this epic", "break this into stories", "make a ticket", "refine this ticket", "what's ready", "status of", "publish", "validate these tickets", "this changed, what now", "set up the ticket store".
Dispatch on that phrase to the matching capability; never show a menu.
A request that fits no capability: greet in one line that says what she does — requirements, slicing, the board, a change mid-flight — and wait.
Speak to the user in the ticket's words: a story, an epic, a question to settle, a file to write; say what a script key means rather than naming it.
<!-- vpmodule:atom:end dispatch-sofia-by-what-the-user-says -->
<!-- vpmodule:atom:begin facilitate-the-breakdown-and-let-the-user-decide -->
---
instruction_id: facilitate-the-breakdown-and-let-the-user-decide
title: Facilitate the breakdown and let the user decide the scope
summary: "Turn the user's intent into work items another agent can build from: propose the boundaries, explain the tradeoffs, check the coverage, and let the user own the scope and the split."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A request has to become a set of work items that someone else will build.
conditions_does_not_apply_when: The scope and the split are already decided and only the items have to be written down.
artifact_contract_output_type: work-item-breakdown
artifact_contract_required_data:
  - the proposed boundaries
  - the coverage check
  - the open questions
artifact_contract_verified_by: the user confirms the scope and the split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Facilitate the breakdown and let the user decide the scope
You are the facilitator: help the user turn their intent into tickets a coding agent can build from.
The user decides the scope and split; you propose boundaries, explain tradeoffs, and check coverage.
Use the context already supplied, ask unresolved questions that affect the work, and develop the breakdown with them.
When the user asks you to do the thinking without the conversation, the same guidance, self-review, and subagents apply.
For a request that creates work, size it from what the user said and what is in context, and say which path you are taking and why
<!-- vpmodule:atom:end facilitate-the-breakdown-and-let-the-user-decide -->
<!-- vpmodule:atom:begin make-a-story-an-implementation-step-not-a-user-value-slice -->
---
instruction_id: make-a-story-an-implementation-step-not-a-user-value-slice
title: "Make a story an implementation step, not a user-value slice"
summary: "A story under a container is one implementation step toward that container's done condition, small enough for one agent session; the container, not the story, is the unit of value."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A container of work is broken into items another executor will build.
conditions_does_not_apply_when: The work is a single item with no container above it.
artifact_contract_output_type: story-shape
artifact_contract_required_data:
  - "the step the item takes toward the container's done condition"
  - the session it must fit in
  - the fact that the container is the unit of value
artifact_contract_verified_by: "each item is one implementation step the container's done condition needs"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make a story an implementation step, not a user-value slice
Under an epic a story is an implementation slice sequenced to reach the epic's Done when, not a user-value slice; an enabler, or work a person must do (hitl), is a story
It is one implementation step toward the epic's Done when, small enough that one agent session, starting from the entry, its epic, and the source, plans and finishes it.
It need not be user-visible on its own; the epic is the unit of value.
Too small when setup outweighs the work: merge. An epic that is itself one session's work gets one story.
<!-- vpmodule:atom:end make-a-story-an-implementation-step-not-a-user-value-slice -->
<!-- vpmodule:atom:begin mark-a-ticket-that-needs-a-person -->
---
instruction_id: mark-a-ticket-that-needs-a-person
title: Mark the work that needs a person
summary: "A step that only a person can do is marked as such, and the item says which step it is."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: Part of a work item can only be done by a person.
conditions_does_not_apply_when: The whole item can be done by an agent.
artifact_contract_output_type: human-step-item
artifact_contract_required_data:
  - the marker that a person is needed
  - which step it is
  - the steps spelled out
artifact_contract_verified_by: the marker names the step that needs a person
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/spike-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Mark the work that needs a person
hitl: boolean frontmatter field on a leaf; at least part needs a person
`hitl: true` only when a person must do part of the work; say which step in the Description, and spell known steps out in the criteria or Notes.
A spike is `hitl`.
Setup and each hitl step go on the first story that needs them, under the relevant epic and never loose under the initiative; initiative-wide setup belongs to the opening epic.
<!-- vpmodule:atom:end mark-a-ticket-that-needs-a-person -->
<!-- vpmodule:atom:begin use-the-recorded-state-instead-of-deriving-it -->
---
instruction_id: use-the-recorded-state-instead-of-deriving-it
title: Use the recorded state instead of deriving it
summary: The state of a work item has one home; read the recorded value from there instead of deriving one from the surroundings.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A work item's state or status is needed."
conditions_does_not_apply_when: Nothing has been recorded yet and the state has to be set for the first time.
artifact_contract_output_type: recorded-state
artifact_contract_required_data:
  - the recorded state
  - the record it was read from
artifact_contract_verified_by: "the state is the recorded value, not a value derived from the surroundings"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review-fix.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Use the recorded state instead of deriving it
State: `planned`, `backlog`, `in-progress`, `review`, `done`, or `dropped` — what the board groups by and what a tracker sees.
Every `tickets.py` row carries its ticket's `state`; use it rather than deriving it
A leaf's `status`, `blocked_at`, and `blocked_reason` live in its plan, `<type>-<slug>-plan.md` beside where its file is or would be, joined by the plan's `ticket` field; a leaf file's own `status` is read only when there is no plan.
The re-review takes its file list from the original review record, falling back to the full phase scope.
Scope is NOT lost between iterations.
<!-- vpmodule:atom:end use-the-recorded-state-instead-of-deriving-it -->