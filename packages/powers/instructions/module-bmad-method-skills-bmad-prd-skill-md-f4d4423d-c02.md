---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prd-skill-md-f4d4423d-c02"
title: "bmad-method: skills/bmad-prd/SKILL.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-prd/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prd/SKILL.md\"}"
atom_ids:
  - offer-to-resume-an-in-progress-run
  - open-with-a-brain-dump
  - polish-the-structure-before-the-prose
  - reconcile-every-input-against-the-document
  - route-the-overflow-into-the-addendum
  - shape-the-document-to-the-product-not-the-template
  - triage-the-open-items-into-blockers-and-deferred
atom_count: 7
atoms: "[{\"atom_id\":\"offer-to-resume-an-in-progress-run\",\"file_sha256\":\"42903c3a06cd7079e1669563266533261f23e9ea0f0d209e34be52d1d4314be2\",\"content_sha256\":\"0f915edd5016b6d27003f1b746006f2de0b4393e9ea1969b46774ade4a4fc309\",\"file_bytes\":1733,\"body_bytes\":585},{\"atom_id\":\"open-with-a-brain-dump\",\"file_sha256\":\"6ef3bb741d662b32724ad33abf38d4abb193a22968bf4d2b3284559a9b95ec50\",\"content_sha256\":\"ae2108809592ec3b4c64ec228760c9a1bae4c7da65431831dd17e2208c8fc233\",\"file_bytes\":2311,\"body_bytes\":1079},{\"atom_id\":\"polish-the-structure-before-the-prose\",\"file_sha256\":\"40ca0e83990d9f7f79e4e58e2f3e84bd68b167b2b980716e187d34c6b15d9674\",\"content_sha256\":\"80497133c4b279c551c08f69784f08b33ccda10e791e3c409c423e15c68a37fe\",\"file_bytes\":1582,\"body_bytes\":404},{\"atom_id\":\"reconcile-every-input-against-the-document\",\"file_sha256\":\"7f67ca6a03451209b624749e9c736b6a8eb52693291812a3bf038eefa73645a0\",\"content_sha256\":\"1b983e0ba5fa3882595189d6e386d041fda9b067b4dd8686f619b6403f8cdb00\",\"file_bytes\":1458,\"body_bytes\":308},{\"atom_id\":\"route-the-overflow-into-the-addendum\",\"file_sha256\":\"bd52833b816b7f1fc3762d44e2afb2facaf0cf82c3d9b1f46dac3df20da61761\",\"content_sha256\":\"7c92effd09c4cb1ef861b6202109bfbb84df068635a85cafff3d67f5f4962b36\",\"file_bytes\":2096,\"body_bytes\":796},{\"atom_id\":\"shape-the-document-to-the-product-not-the-template\",\"file_sha256\":\"20ebd18a5eed672d36d1aa60a7d8e54356371f865794c15bbf6fb8e57ab378d4\",\"content_sha256\":\"7efa01f1f25294b23d9d9f286994b8ee42bfaa7eb3e7123191090bc198b2a85b\",\"file_bytes\":3003,\"body_bytes\":1383},{\"atom_id\":\"triage-the-open-items-into-blockers-and-deferred\",\"file_sha256\":\"64efec044746f53984d32f32938764bbac5361e883966b52656a1d8f11771171\",\"content_sha256\":\"862011cadd590d0b6b785155508a8760d5e17db70213f8187f79dd5414ec06ac\",\"file_bytes\":1908,\"body_bytes\":441}]"
carrier_sha256: 719502f5d436c2ddda36b874935a455394fd74bda11acaa723ccf7eeb894a009
carrier_bytes: 15034
revision: 1
status: active
---
<!-- vpmodule:atom:begin offer-to-resume-an-in-progress-run -->
---
instruction_id: offer-to-resume-an-in-progress-run
title: Offer to resume an in-progress run
summary: "Look for a run that is still in progress before starting a fresh one, and offer to resume it."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A new run is about to bind a workspace for a product that may already have one.
conditions_does_not_apply_when: No earlier run exists for this product.
artifact_contract_output_type: resume-decision
artifact_contract_required_data:
  - the in-progress run that was found
  - the offer to resume it
artifact_contract_verified_by: an existing in-progress run was offered rather than silently replaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Offer to resume an in-progress run
Before binding a fresh workspace, scan
for prior in-progress runs
whose status is not final;
if any exist, offer to resume rather than starting over.
When the ticket is an epic, scan the epic's folder as well.
The run lands in `prd-{slug}`; on an epic, use the epic's slug without `epic-`.
Continuity across sessions. If a prior in-progress draft for this project exists, the user is offered to resume.
Set the document's status to final so future invocations distinguish it from in-progress drafts.
The workspace persists; stop and resume freely.
<!-- vpmodule:atom:end offer-to-resume-an-in-progress-run -->
<!-- vpmodule:atom:begin open-with-a-brain-dump -->
---
instruction_id: open-with-a-brain-dump
title: Open with a brain dump
summary: "Start with the full picture: invite the dump and the existing sources, read what exists first, and drill into specifics only afterwards."
capability_tags:
  - clarify-requirements
pattern_tags:
  - staged-elicitation
conditions_applies_when: A requirements conversation starts and the owner’s context is not yet on the table.
conditions_does_not_apply_when: The context is already complete and only the document is missing.
artifact_contract_output_type: discovery-set
artifact_contract_required_data:
  - the owner’s own account
  - the sources they supplied
  - the gaps that were left
artifact_contract_verified_by: the broad shape was on the table before any granular question was asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Open with a brain dump
Always the first move, even when the user opens with paragraphs of context (that is intake, not the dump).
When a ticket exists for this work (`initiative-*.md`, `tickets/epic-*/epic-*.md`; older projects `SPEC*.md`), read it yourself, first and in full, and treat its Requirements as settled.
Ask for verbal context *and* any other existing inputs they want you to read — product brief, research, customer transcripts, competitive analysis, prior PRD draft, design docs.
Paths or paste; big docs are fine, you will subagent-extract.
A simple "anything else?" surfaces what they almost forgot.
Open with space for the full picture: invite a brain dump and ask up front for any source material they already have (memo, deck, transcript, prior brief, slack thread).
Read what exists first; ask only what is missing.
Drill into specifics only after the broad shape is on the table; premature granular questions interrupt the dump and miss the room.
Form-factor. If not stated in sources, probe — mobile / web / desktop / multi-surface / hardware / API.
<!-- vpmodule:atom:end open-with-a-brain-dump -->
<!-- vpmodule:atom:begin polish-the-structure-before-the-prose -->
---
instruction_id: polish-the-structure-before-the-prose
title: Polish the structure before the prose
summary: "Run the structural passes first and the prose passes last, so the prose never polishes text that is about to be cut."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A document is being polished in passes.
conditions_does_not_apply_when: Only one pass is being made over the text.
artifact_contract_output_type: polish-order
artifact_contract_required_data:
  - the pass order
  - the passes applied in that order
artifact_contract_verified_by: the structural passes ran before the prose passes and the polish came after the reviewer fixes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Polish the structure before the prose
Polish goes last so it does not redo work after reviewer fixes.
structural passes before prose — prose should not polish soon-to-be-cut text
Parallelize across documents, sequential within.
Run passes as parallel subagents - apply all doc standards to the
document first, then
the addendum
so we present a high-quality draft for the user to review and finalize.
<!-- vpmodule:atom:end polish-the-structure-before-the-prose -->
<!-- vpmodule:atom:begin reconcile-every-input-against-the-document -->
---
instruction_id: reconcile-every-input-against-the-document
title: Reconcile every input against the document
summary: "Check each source the owner supplied against the document and surface the gaps, including the qualitative ones the requirement structure drops."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The document has been drafted from the sources the owner supplied.
conditions_does_not_apply_when: No sources were supplied beyond the conversation itself.
artifact_contract_output_type: input-reconciliation
artifact_contract_required_data:
  - each source
  - the gaps found in it
  - the qualitative ideas the structure dropped
artifact_contract_verified_by: every supplied source was checked and its gaps were surfaced before the polish
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Reconcile every input against the document
Subagent per user-supplied input against the
document and the addendum.
returns ONLY a compact summary (input name, gaps 2-5, file path)
Surface gaps — especially qualitative ideas (tone, voice, feel) the FR structure silently drops.
Must happen before polish.
<!-- vpmodule:atom:end reconcile-every-input-against-the-document -->
<!-- vpmodule:atom:begin route-the-overflow-into-the-addendum -->
---
instruction_id: route-the-overflow-into-the-addendum
title: Route the overflow into the addendum
summary: "Capture the depth the document cannot hold in the addendum while the owner is still talking, and keep audit and override information out of it."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The owner volunteers depth that the narrative of the document cannot carry.
conditions_does_not_apply_when: The content belongs in a downstream document that already exists.
artifact_contract_output_type: addendum
artifact_contract_required_data:
  - the captured depth
  - the moment of the conversation it was captured at
artifact_contract_verified_by: the overflow was captured during the conversation and no audit or override information sits in the addendum
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Route the overflow into the addendum
The addendum
preserves user-contributed depth that belongs in a downstream document (architecture, solution design, UX spec) or earned a place but does not fit the PRD itself — rejected-alternative rationale, options-considered matrices, mechanism/transport decisions, technical-how, in-depth personas, sizing data.
Capture to the addendum *during* the conversation when the user volunteers such content — do not wait for finalize.
Audit and override information never goes in the addendum.
Whatever the length, detail that doesn't earn its place in the PRD's main narrative belongs in
the addendum
— moving overflow there is correct; padding the PRD to look thorough is not.
Aim for 1-2 pages — if it is longer, the detail belongs in the addendum.
<!-- vpmodule:atom:end route-the-overflow-into-the-addendum -->
<!-- vpmodule:atom:begin shape-the-document-to-the-product-not-the-template -->
---
instruction_id: shape-the-document-to-the-product-not-the-template
title: "Shape the document to the product, not the template"
summary: "Start from the default spine, add the clusters the product’s concerns need, invent a section when none names the concern, and drop a section only for a reason a reviewer would accept."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The sections of a requirements document are being chosen.
conditions_does_not_apply_when: Another instruction already fixes the sections of this document.
artifact_contract_output_type: document-shape
artifact_contract_required_data:
  - the sections kept
  - the sections dropped and the reason
  - the sections invented
artifact_contract_verified_by: no section is present because the template has it and no concern is left uncovered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - design-ux
---

# Shape the document to the product, not the template
Cross-cutting NFRs in their own section; skip traceability matrices.
Treat the
template as expert prior knowledge, not a checklist.
The Essential Spine is the expected default — present it unless the product genuinely doesn't need a section, and when you drop one, do so for a reason a reviewer would agree with.
The Adapt-In Menu is conditional: pull in the clusters the product's concerns need to best define the requirements.
When the product carries a concern the menu doesn't name, invent the section — name it well, decide what belongs in it, place it where it serves the reader or the PRD.
Reorder and combine for readability.
Never include a section because it appears; never skip a concern because no template section covered it.
Treat the
brief template
as a starting structure, not a contract: drop sections that do not earn their place, add sections the product needs, reorder freely - create sections for specialized domains or concerns also as needed.
The brief serves the product's story, not the template's shape.
Adapt aggressively to the product, the purpose, and the domain. Drop sections that do not earn their place, add sections the product needs, reorder freely.
If UX work or other inputs already exist, name them here and reference where they live — this PRD builds on them, it does not duplicate.
<!-- vpmodule:atom:end shape-the-document-to-the-product-not-the-template -->
<!-- vpmodule:atom:begin triage-the-open-items-into-blockers-and-deferred -->
---
instruction_id: triage-the-open-items-into-blockers-and-deferred
title: Triage the open items into blockers and deferred
summary: "Resolve the open questions and assumptions that would make the document unsafe, one at a time, and defer the rest with an owner and a revisit condition."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: "The document holds open questions, assumption tags and callouts that still need a decision."
conditions_does_not_apply_when: There is nothing open.
artifact_contract_output_type: open-item-triage
artifact_contract_required_data:
  - the open items
  - the blocker verdict for each
  - the owner and the revisit condition of each deferred item
artifact_contract_verified_by: every blocker is resolved and every deferred item carries an owner and a revisit condition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-validation-checklist.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-uat.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - product
---

# Triage the open items into blockers and deferred
Triage open items. All Open Questions, `[ASSUMPTION]` tags, `[NOTE FOR PM]` callouts.
Phase-blockers (would make the PRD unsafe for UX/architecture/epics) surfaced one at a time and resolved; non-blockers deferred with owner + revisit condition
If phase-blocker count is high, flag it.
An outstanding item does not stop mattering because its phase belongs to an already-archived milestone.
<!-- vpmodule:atom:end triage-the-open-items-into-blockers-and-deferred -->