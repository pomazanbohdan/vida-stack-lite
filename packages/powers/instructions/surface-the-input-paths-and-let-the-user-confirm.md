---
instruction_id: surface-the-input-paths-and-let-the-user-confirm
title: Surface the input paths and let the user confirm
summary: "Read the ticket in full when one exists; with no ticket, list candidate inputs by type, surface the paths only, and let a subagent extract on confirm."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Several candidate source documents could inform the work.
conditions_does_not_apply_when: The sources are already known and read.
artifact_contract_output_type: input-selection
artifact_contract_required_data:
  - the candidate paths by type
  - the confirmed set
artifact_contract_verified_by: "the ticket was read in full, or the confirmed sources were read by the extractor, not the parent"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Surface the input paths and let the user confirm
When a ticket exists for the work, find it (`initiative-*.md`, `tickets/epic-*/epic-*.md`, and story/bug/spike files in a `tickets/` folder under `{output_folder}/{active_initiative}/`) and read it in full in the parent. Its Requirements are the brief; its `sources:` and `companions:` list what else exists. Open one of those only for a need the ticket points at; never re-derive requirements from a PRD or brief it already distilled.
With no ticket, list candidate inputs by type — `<type>-*/<type>-*.md` for `brief`, `prd`, `spec`, `architecture`, `research` — and let the user confirm.
Surface paths only when there is no ticket; subagent-extracts on confirm.
