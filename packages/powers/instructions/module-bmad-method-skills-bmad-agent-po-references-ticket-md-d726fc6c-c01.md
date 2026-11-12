---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-ticket-md-d726fc6c-c01"
title: "bmad-method: skills/bmad-agent-po/references/ticket.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-agent-po/references/ticket.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/ticket.md\"}"
atom_ids:
  - ask-only-what-is-unsettled-and-offer-a-default
  - keep-a-source-conflict-ticket-unrefined
  - link-the-design-and-keep-the-criteria-functional
  - mark-an-entry-ready-to-refine
  - nothing-in-the-ticket-contradicts-its-source
  - pull-a-leaf-before-reviewing-or-refining-it
  - review-changes-the-intent-and-not-the-state
  - self-review-the-ticket-before-the-user-sees-it
atom_count: 8
atoms: "[{\"atom_id\":\"ask-only-what-is-unsettled-and-offer-a-default\",\"file_sha256\":\"f2733796b7aec307ae92ca911fd67f5cff65dad10cd5ec337523e4d8b612e325\",\"content_sha256\":\"39d3a754a3e1113bbbe19716832d6eebf19b915e04c549623ca93d8ac6a8167a\",\"file_bytes\":1953,\"body_bytes\":621},{\"atom_id\":\"keep-a-source-conflict-ticket-unrefined\",\"file_sha256\":\"491b609bbfdea919c9691dfd6679dd9fd3c150c6d2e3d4d3df599c2b8d101cf2\",\"content_sha256\":\"7740faf6e0d75a74419df1cf66aada0d049bef75c3f2948d7e2790b7b16a7d0c\",\"file_bytes\":1710,\"body_bytes\":375},{\"atom_id\":\"link-the-design-and-keep-the-criteria-functional\",\"file_sha256\":\"cebc2a38fafefad473ce1479700d2b36a41db3eef0f706078b034bb737a4354b\",\"content_sha256\":\"36c899b58b40e1641d1a93541a74f67f8ea79ff9768b7b6f1d4f5534d5c62328\",\"file_bytes\":1401,\"body_bytes\":288},{\"atom_id\":\"mark-an-entry-ready-to-refine\",\"file_sha256\":\"18824c5af1e4227e49364e6bfe6f93d2a6c3dd46a6edb4309725e930daca712b\",\"content_sha256\":\"d4966aff92f4fddfb3185708b7fb26b30296a23d36d1af34357dbb1d03c81eba\",\"file_bytes\":1577,\"body_bytes\":378},{\"atom_id\":\"nothing-in-the-ticket-contradicts-its-source\",\"file_sha256\":\"32fb7ee936c7fbc9e06f180b59dc39a56365babdbf50972c34650d6fb1de726c\",\"content_sha256\":\"37322683498ae418311fabc15a2115450d4fd0277c0012581edd1d3c1e6628c2\",\"file_bytes\":1809,\"body_bytes\":483},{\"atom_id\":\"pull-a-leaf-before-reviewing-or-refining-it\",\"file_sha256\":\"7f4ba1bb6ffc9d258dcd5079203a253e3e3a982bdc3123c513d27db630e2c76c\",\"content_sha256\":\"078b34f13ad49bf5a68cc02c37fb75679ee213f9396164630828559b0bd1dafd\",\"file_bytes\":1446,\"body_bytes\":323},{\"atom_id\":\"review-changes-the-intent-and-not-the-state\",\"file_sha256\":\"764ade996f942da4e05de0fc51e77007911c50dd16fdc0178b40d457f3cdef16\",\"content_sha256\":\"1571e0d576b835cf7da5978164ad70ba67a6307728e80b580ecaaf16b3e41712\",\"file_bytes\":1621,\"body_bytes\":393},{\"atom_id\":\"self-review-the-ticket-before-the-user-sees-it\",\"file_sha256\":\"9ebf645a8f3c9e45708e56cc3cd6bd299c31e2e64f3145da092e5490bdd83d28\",\"content_sha256\":\"e1218052a7bdcffd911e97e8db6a9ad8f34878c4f4c792106a0e8ef3a643b4d8\",\"file_bytes\":1572,\"body_bytes\":385}]"
carrier_sha256: 4d69901b7de25d653633e6676096d53f8f99007f8423c4a1d8ddeab5d180298b
carrier_bytes: 14228
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-only-what-is-unsettled-and-offer-a-default -->
---
instruction_id: ask-only-what-is-unsettled-and-offer-a-default
title: Ask only what is unsettled and offer a default
summary: "A work item starts from what is known: what exists when it is done, how it will be verified, what must not change and what is already decided; only the rest is asked, each with a default."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A work item is being drafted from what is known so far.
conditions_does_not_apply_when: The requirements and the decisions are already written down.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - what is already known
  - the questions that remain
  - the default offered for each
artifact_contract_verified_by: every question left open carries a default that produces a working item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/autonomous-smart-discuss.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Ask only what is unsettled and offer a default
A ticket starts from what is known: what exists when it is done, how it will be verified, what must not change, and what is already decided.
Ask only what remains unsettled, offering a default for each, then draft into the ticket tree.
Read project-level and prior phase context to avoid re-asking decided questions.
Check prior_decisions — skip grey areas already decided in prior phases.
Pre-select a recommended answer based on: prior decisions (consistency), codebase patterns (reuse), domain conventions (standard approaches)
Generate 1-2 alternatives per question
<!-- vpmodule:atom:end ask-only-what-is-unsettled-and-offer-a-default -->
<!-- vpmodule:atom:begin keep-a-source-conflict-ticket-unrefined -->
---
instruction_id: keep-a-source-conflict-ticket-unrefined
title: Keep a source-conflict ticket unrefined
summary: "When the code contradicts a Requirements line, record a `Source conflict:` line, offer the correction through `spec.md`, and keep covering tickets `refined: false` until a `Decision:` line settles it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stop-on-conflict
  - requirements-clarification
conditions_applies_when: A ticket is refined and the code contradicts a Requirements line it covers.
conditions_does_not_apply_when: The code agrees with the source or the ticket covers no conflicting line.
artifact_contract_output_type: source-conflict-record
artifact_contract_required_data:
  - the conflicting id or section
  - what the source says and what was found
  - the tickets left unrefined
artifact_contract_verified_by: "the conflict is recorded and every covering ticket stays `refined: false` until a `Decision:` line settles it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - engineering
---

# Keep a source-conflict ticket unrefined
Where the code contradicts a Requirements line, add a `Source conflict: <id or section> — <what the source says> vs <what was found>` line to the Notes of the container that owns the line.
Tell the user and offer the correction through `spec.md`.
Tickets covering that id stay `refined: false` until a `Decision:` line settles it.
<!-- vpmodule:atom:end keep-a-source-conflict-ticket-unrefined -->
<!-- vpmodule:atom:begin link-the-design-and-keep-the-criteria-functional -->
---
instruction_id: link-the-design-and-keep-the-criteria-functional
title: Link the design and keep the criteria functional
summary: A user-facing item links its design and says plainly what the builder has to guess when there is no design.
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A work item is about a user-facing surface and a design exists.
conditions_does_not_apply_when: The work item has no user-facing part.
artifact_contract_output_type: design-linked-item
artifact_contract_required_data:
  - the design reference
  - the functional criteria
  - what the builder must guess when no design exists
artifact_contract_verified_by: the design owns the layout and the criteria stay functional
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Link the design and keep the criteria functional
A UI ticket links its design in References; criteria stay functional, layout lives in the design.
No design and user-facing: offer the design skill first; declined, say the builder will guess the layout unless they add details in Notes.
<!-- vpmodule:atom:end link-the-design-and-keep-the-criteria-functional -->
<!-- vpmodule:atom:begin mark-an-entry-ready-to-refine -->
---
instruction_id: mark-an-entry-ready-to-refine
title: Mark an entry ready to refine
summary: "An entry that needs full criteria before it starts carries `refine = true` and `refined: false`; `tickets.py next` lists it under `ready_to_refine`."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - approval-policy-gate
conditions_applies_when: A bug, a story with no epic, or an entry the user wants fully specified is planned.
conditions_does_not_apply_when: The story builds from its entry without full criteria.
artifact_contract_output_type: refine-flag
artifact_contract_required_data:
  - the entry
  - the `refine` and `refined` values
  - the user's approval that clears the flag
artifact_contract_verified_by: "the entry carries `refine = true` and `refined: false` until the user approves the criteria"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Mark an entry ready to refine
A refine sets `refine = true` on the entry and `refined: false` in the file.
`tickets.py next` lists under `ready_to_refine` every bug, entry with `refine = true`, and leaf with no entry.
A story with no file is pulled before refinement.
A refined ticket sets `refined: true` on the user's approval; a review sets neither `refined` nor `status`.
<!-- vpmodule:atom:end mark-an-entry-ready-to-refine -->
<!-- vpmodule:atom:begin nothing-in-the-ticket-contradicts-its-source -->
---
instruction_id: nothing-in-the-ticket-contradicts-its-source
title: Nothing in the item contradicts its source
summary: "Nothing in the item contradicts the requirement source, its companions, the architecture or a recorded decision, and a conflict between the source and the code is written down and reported."
capability_tags:
  - verify-work-results
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A work item is checked against the sources it names.
conditions_does_not_apply_when: The item names no source.
artifact_contract_output_type: consistency-check
artifact_contract_required_data:
  - the sources checked
  - the recorded decision checked against
  - the conflict line when one was found
artifact_contract_verified_by: "nothing in the item contradicts its source, the architecture or a recorded decision"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Nothing in the item contradicts its source
Nothing contradicts the requirement source, its companions, the architecture, or a recorded decision.
Where the source contradicts the code or another source, add `Source conflict: <id or section> — <what the source says> vs <what was found>` to the Notes of the container whose source it is, tell the user, and offer the correction through `spec.md`. Tickets covering that id stay `refined: false` until a `Decision:` line settles it.
<!-- vpmodule:atom:end nothing-in-the-ticket-contradicts-its-source -->
<!-- vpmodule:atom:begin pull-a-leaf-before-reviewing-or-refining-it -->
---
instruction_id: pull-a-leaf-before-reviewing-or-refining-it
title: Pull a leaf before reviewing or refining it
summary: "A leaf with no story file is pulled first; `pull` writes a fixed layout, not the template, and a done or dropped ticket is left as it is."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - progressive-disclosure
conditions_applies_when: A leaf is reviewed, refined, or published and `find` gives a null `story_file`.
conditions_does_not_apply_when: The leaf already has its file.
artifact_contract_output_type: pulled-leaf
artifact_contract_required_data:
  - the leaf id
  - the pulled file
artifact_contract_verified_by: the fixed-layout file exists and the done or dropped record was not reshaped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Pull a leaf before reviewing or refining it
A leaf with no file (`find` gives `story_file` null) is pulled first: `tickets.py pull <epic folder> <id>` writes a fixed layout, not the template.
Review and refine the pulled file.
A done or dropped ticket and its plan are the record: never reshape them to a newer template.
<!-- vpmodule:atom:end pull-a-leaf-before-reviewing-or-refining-it -->
<!-- vpmodule:atom:begin review-changes-the-intent-and-not-the-state -->
---
instruction_id: review-changes-the-intent-and-not-the-state
title: Review the intent and leave the state alone
summary: "A review reads the item, its source and the finished siblings, improves the description, the check, the references and the notes with the user, and sets no status and no refinement flag."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: An existing work item is reviewed with the user before the build starts.
conditions_does_not_apply_when: The item is being refined to full criteria before it starts.
artifact_contract_output_type: review-record
artifact_contract_required_data:
  - "the item, its source and the finished siblings"
  - the changes made with the user
  - the state left untouched
artifact_contract_verified_by: the review changed the intent and no status and no refinement flag
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Review the intent and leave the state alone
Read the file, its source, and the finished siblings and their plans.
With the user, improve the description, `Verify:`, references, and notes; adjust order and prerequisites, and run the set check in `validate.md` on the revised draft when they change.
A review sets neither `status` nor `refined`: the file is intent that is ready for the build
<!-- vpmodule:atom:end review-changes-the-intent-and-not-the-state -->
<!-- vpmodule:atom:begin self-review-the-ticket-before-the-user-sees-it -->
---
instruction_id: self-review-the-ticket-before-the-user-sees-it
title: Self-review the item before the user sees it
summary: "Read the drafted item back at its own level of detail, check its size, wording, references and source consistency, fix what is found, and say what changed in the user's intent."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A drafted work item is about to be shown to the user.
conditions_does_not_apply_when: The item was already reviewed and approved.
artifact_contract_output_type: self-review-record
artifact_contract_required_data:
  - the level of detail read back
  - "size, wording, references and source consistency"
  - the fixes made
artifact_contract_verified_by: the item was read back at its own level of detail and what was found was fixed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Self-review the item before the user sees it
Read it back at its current level of detail: an entry needs its description and verification approach; a refined ticket needs runnable acceptance criteria and settled prerequisites.
Check size (one agent session plans and finishes it), wording, references, and source consistency.
Fix what you find; mention changes to the user's intent.
<!-- vpmodule:atom:end self-review-the-ticket-before-the-user-sees-it -->