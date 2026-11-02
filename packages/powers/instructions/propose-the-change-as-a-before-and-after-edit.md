---
instruction_id: propose-the-change-as-a-before-and-after-edit
title: Propose the change as what changes and what stays
summary: "Show each affected line before and after, name the ticket or entry and section, and say what stays true; no separate proposal file is written."
capability_tags:
  - assess-change-impact
pattern_tags:
  - output-formatting
conditions_applies_when: A change is being proposed against artifacts that already hold text.
conditions_does_not_apply_when: The change creates a new artifact and there is no current text to replace.
artifact_contract_output_type: edit-proposal
artifact_contract_required_data:
  - the artifact
  - the section
  - the current text
  - the replacement text
  - the reason
artifact_contract_verified_by: "every proposal carries the current text, the replacement text and a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
  - product
---

# Propose the change as what changes and what stays
Show the change as before → after where text changes: the ticket or entry, the section, the current line and the proposed line, with the reason.
Name the affected ticket, entry, companion, or plan section, and what stays true.
Explain the effect on built work and on the tickets whose `covers` or `after` name the changed line.
Do not write a separate proposal file: the record is the ticket tree and the dated `Decision:` line.
