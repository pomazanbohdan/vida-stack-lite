---
instruction_id: link-only-to-targets-you-have-seen
title: Link only to targets you have seen
summary: "A link names a target the set actually holds; an invented target, a link to the document itself and a link in a heading, a code block or a field listing are all left out."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document links to other documents of the same set.
conditions_does_not_apply_when: The text carries no link.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the links that were written
  - the list of targets that exists
artifact_contract_verified_by: "every link names a target from the list, no link sits in a heading, a code block or a field listing, and no concept is linked more than once per section"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 2
---

# Link only to targets you have seen
Only link to ids returned by `list_concepts()`.
Do not invent link targets.
One link per concept mention per section is enough.
Do not over-link.
Do not link from headers, fenced code blocks, or schema field-name listings.
Do not link the current doc to itself.
