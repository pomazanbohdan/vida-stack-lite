---
instruction_id: follow-through-on-the-previous-retros-action-items
title: "Follow through on the previous retro's action items"
summary: "The action items the previous retrospective committed to are checked one by one, and an item that cannot be pointed at is recorded as \"no evidence found\" rather than as not done."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: A retrospective runs and a previous retrospective exists.
conditions_does_not_apply_when: "There is no previous retrospective, or its file has no Action items section."
artifact_contract_output_type: follow-through
artifact_contract_required_data:
  - the item
  - its owner
  - whether it landed and the source that shows it
artifact_contract_verified_by: "every item of the previous retrospective is recorded with its source, and a missing file is never read as no outstanding items"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/acceptance-verdict.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Follow through on the previous retro's action items
When the previous epic's retrospective file exists, check whether the action items it committed to were completed.
Read its Action items section, and its Previous-retro follow-through section for the items recorded there as not landed, and for every item, record one line
- **The item** — its action text as the previous file spells it, and its owner.
- **Whether it landed** — with the source that shows it: the commit, the file and line, the test. An item you cannot point at is "no evidence found", not "not done" — the reader must be able to tell a checked item from an unchecked one.
No status is written anywhere; the record is the follow-through.
A run with no previous retrospective file, or one whose file has no Action items section, records that there was nothing to follow through on — and which of those it was, so a missing file is never mistaken for "no outstanding items."
