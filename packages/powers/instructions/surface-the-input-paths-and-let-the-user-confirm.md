---
instruction_id: surface-the-input-paths-and-let-the-user-confirm
title: Surface the input paths and let the user confirm
summary: "List the candidate inputs by type, surface the paths only and never read the content in the parent, let the user confirm which apply, and let a subagent extract on confirm."
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
artifact_contract_verified_by: "the user confirmed the set and the content was read by the extractor, not by the parent"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
status: active
revision: 1
---

# Surface the input paths and let the user confirm
List candidate inputs by type — `<type>-*/<type>-*.md` for `brief`, `prd`, `spec`, `architecture`, `research`
Surface paths only — never read content in the parent.
User confirms which apply or adds others; subagent-extracts on confirm.
