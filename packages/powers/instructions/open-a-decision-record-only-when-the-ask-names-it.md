---
instruction_id: open-a-decision-record-only-when-the-ask-names-it
title: Open a decision record only when the ask names it
summary: "A decision record enters the context only when the ask names or continues it, because a document in context gets repeated whether or not it still holds."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The repository holds decision records and a research run is being set up.
conditions_does_not_apply_when: The ask names a decision record explicitly.
artifact_contract_output_type: decision-record-selection
artifact_contract_required_data:
  - the decision records listed
  - the one opened
  - the reason it was opened
artifact_contract_verified_by: only the decision record the ask named was opened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 1
---

# Open a decision record only when the ask names it
- and open one only when the ask names or continues it, since a document in context gets repeated whether or not it still holds.
