---
instruction_id: match-the-example-for-detail-not-for-text
title: "Match the example for detail, not for text"
summary: The placeholders of a template say what each section holds; its example shows the level of detail to match and is not copied.
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A template carries an example of a filled item.
conditions_does_not_apply_when: The template carries no example.
artifact_contract_output_type: detail-level-match
artifact_contract_required_data:
  - the level of detail the example shows
  - the text that is not copied
artifact_contract_verified_by: "the item matches the example's level of detail and copies none of its text"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/ticket-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body only governs how to use an example in a filled template; it names no supported technical, product, business, UX, research, or concrete operational subject."
---

# Match the example for detail, not for text
Example, not part of the ticket: match its level of detail.
Its placeholders say what each section holds; its example is the level of detail to match, not copied.
