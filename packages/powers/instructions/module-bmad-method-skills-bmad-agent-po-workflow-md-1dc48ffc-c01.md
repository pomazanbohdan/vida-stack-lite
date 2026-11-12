---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-workflow-md-1dc48ffc-c01"
title: "bmad-method: skills/bmad-agent-po/workflow.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-agent-po/workflow.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/workflow.md\"}"
atom_ids:
  - answer-status-without-starting-the-next-step
  - keep-each-container-s-breakdown-in-its-tickets-folder
  - read-the-ticket-before-answering-about-it
atom_count: 3
atoms: "[{\"atom_id\":\"answer-status-without-starting-the-next-step\",\"file_sha256\":\"12e443fe2aa99f845c62d496946087a22fd1f300d4decae1f8718681cb63ba40\",\"content_sha256\":\"a8a172a264f20b230e0ff7d1461bc5df775b292f87008e3c764fd59eef48d738\",\"file_bytes\":1607,\"body_bytes\":503},{\"atom_id\":\"keep-each-container-s-breakdown-in-its-tickets-folder\",\"file_sha256\":\"bf51f5b30ee312157b102e0794a3d87a70c4997ee3ee958a8b95e9adceb0ed41\",\"content_sha256\":\"3fc77e15d8607fc1348f4c38912a5af908eafafee04fd6c0cc8082cb5aaf88ca\",\"file_bytes\":1809,\"body_bytes\":624},{\"atom_id\":\"read-the-ticket-before-answering-about-it\",\"file_sha256\":\"f9768e54992fe885013992533f53b97f7517c46d6baf9fddb3a87dcba4bcdc7e\",\"content_sha256\":\"c08ce2b94aff7a1a886fd0ff904b17f2ed86d3d9ceadde4bac697540c1357a48\",\"file_bytes\":1746,\"body_bytes\":565}]"
carrier_sha256: d3b94f80ebd82d7e1f4fa7c854ca52ab86b88ae63149a80e037b71ba79f954ab
carrier_bytes: 5611
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-status-without-starting-the-next-step -->
---
instruction_id: answer-status-without-starting-the-next-step
title: Answer status without starting the next step
summary: "A status answer lists the initiative folder and the ticket's state, names the next step, and starts nothing."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: The user asks for status, what is ready, or what comes next.
conditions_does_not_apply_when: The user asks to start or build a named ticket.
artifact_contract_output_type: status-answer
artifact_contract_required_data:
  - the initiative folder and its unfolded inputs
  - the ticket's state
  - the next step
artifact_contract_verified_by: "the answer reports state and names the next step without starting it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/workflow.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Answer status without starting the next step
A status or "what's next" answer lists the initiative folder — a `<type>-<slug>/` absent from `sources:` and `companions:` is an input not yet folded in, and is not opened — and reports the file's state: open questions and assumptions, not sliced, epics not refined, entries ready, blocked.
Name the next step without starting it.
Only an explicit start request starts work, and it is a separate yes from approving the plan or publishing to a tracker.
<!-- vpmodule:atom:end answer-status-without-starting-the-next-step -->
<!-- vpmodule:atom:begin keep-each-container-s-breakdown-in-its-tickets-folder -->
---
instruction_id: keep-each-container-s-breakdown-in-its-tickets-folder
title: Keep each container's breakdown in its tickets folder
summary: "A container keeps its own file, memlog and companions at the top of its folder, and its breakdown in a `tickets/` folder inside it."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
  - stable-identity
conditions_applies_when: A ticket tree is created, read or migrated.
conditions_does_not_apply_when: The tree is a flat list with no containers.
artifact_contract_output_type: ticket-tree-layout
artifact_contract_required_data:
  - each container's own files
  - the `tickets/` folder and what it holds
  - the backlog location
artifact_contract_verified_by: every breakdown sits in its container's `tickets/` folder and every standalone leaf in `backlog/`
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/workflow.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Keep each container's breakdown in its tickets folder
An initiative or epic keeps its own file, `.memlog.md`, other skills' run folders and its retrospective at the top of its folder, and its breakdown in a `tickets/` folder inside it.
An initiative's `tickets.toml` lists child initiatives, epics, or entries, one kind only.
An epic's `tickets/` holds its `tickets.toml`, leaf files and plans.
A standalone leaf lives in `{output_folder}/backlog/` beside its plan.
A tree from the earlier layout, with `tickets.toml` and epic folders directly in the initiative folder, makes `tickets.py` stop: run `bmad migrate method`.
<!-- vpmodule:atom:end keep-each-container-s-breakdown-in-its-tickets-folder -->
<!-- vpmodule:atom:begin read-the-ticket-before-answering-about-it -->
---
instruction_id: read-the-ticket-before-answering-about-it
title: Read the ticket before answering about it
summary: "On every request about a ticket, read the ticket at the altitude asked — initiative, epic or leaf — first and in full before running the board or opening any other file."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - progressive-disclosure
conditions_applies_when: A request concerns an initiative, an epic or a leaf in the ticket tree.
conditions_does_not_apply_when: The request is an explicit start of a leaf.
artifact_contract_output_type: ticket-read
artifact_contract_required_data:
  - the ticket at the altitude asked
  - the file it was read from
artifact_contract_verified_by: the ticket was read in full before the board ran or another file was opened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/workflow.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Read the ticket before answering about it
On every request about a ticket, read the ticket at the altitude asked: the initiative's file, an epic's file, or a leaf's file when pulled; a leaf with no file is its entry and its epic file.
Read it first and in full, before `tickets.py next` or `status` and before any file but the item's reference.
Its `sources:` were distilled into it; open a companion only when the step needs it.
A start request is exempt from the full read: `find` the ticket, confirm it is unassigned, and hand it to the builder, who reads it.
<!-- vpmodule:atom:end read-the-ticket-before-answering-about-it -->