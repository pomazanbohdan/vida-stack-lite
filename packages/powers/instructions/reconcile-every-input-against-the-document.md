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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
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
