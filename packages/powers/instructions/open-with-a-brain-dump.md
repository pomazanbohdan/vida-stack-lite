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
