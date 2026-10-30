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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/story-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body only governs how to use an example in a filled template; it names no supported technical, product, business, UX, research, or concrete operational subject."
---

# Match the example for detail, not for text
Example, not part of the ticket: match its level of detail.
Its placeholders say what each section holds; its example is the level of detail to match, not copied.
