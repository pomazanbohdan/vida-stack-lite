---
instruction_id: derive-the-document-from-the-log
title: Derive the document from the log
summary: "The document is re-derived from the canonical log on every run and never hand-patched, so the steps around it can run in any order."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run has a canonical log and a document that is derived from it.
conditions_does_not_apply_when: There is no log and the document is written directly.
artifact_contract_output_type: derived-document
artifact_contract_required_data:
  - the log the document was derived from
  - the document rendered from it
artifact_contract_verified_by: the document was rendered from the log and no edit was made to it by hand
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
status: active
revision: 1
---

# Derive the document from the log
Derived on each run from the
log (the decision-of-record) plus the sources it cites for raw content — never hand-patched.
Deriving the contract from a living log instead of editing the contract in place is what lets the steps around the spec (PRD, UX, architecture, epics) run in any order and feed the same spec without merge drift: the log only accumulates, the artifact is re-rendered.
The spec is updated *only* by re-deriving it here —
a hand-edit
from outside is unsupported and is overwritten on the next derive.
Multiple skills may call to update the same spec over time.
The log (not the rendered document) is the authority on what was decided and on capability IDs.
