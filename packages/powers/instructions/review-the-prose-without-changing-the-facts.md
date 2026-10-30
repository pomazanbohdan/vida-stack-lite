---
instruction_id: review-the-prose-without-changing-the-facts
title: Review the prose without changing the facts
summary: "Edit the wording of a document for the people who will read it, and restore anything the edit drops: qualifiers, caveats, numbers and trade-offs."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An existing document is edited for clarity.
conditions_does_not_apply_when: The document is new and has no source to compare against.
artifact_contract_output_type: prose-review
artifact_contract_required_data:
  - the details marked to survive
  - the passages rewritten
  - the qualifiers and caveats restored
  - the unresolved factual questions
artifact_contract_verified_by: every marked detail is still present in the edited document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Review the prose without changing the facts

After checking the technical content, review the prose for the people who will use it. Clearer wording must not change the decision or its limits.

1. Mark the details that must survive the edit: names, numbers and units, commands, paths, links, conditions, trade-offs, and uncertainty. Check them against the available code and decision context; flag anything you cannot substantiate.
2. Replace stock introductions, promotional adjectives, and repeated summaries with the concrete information the reader needs. Do not replace an unsupported claim with an invented example or a stronger guarantee. Keep necessary technical repetition and the project's established terminology.
3. Compare the edited document with the original and its sources. Restore any lost qualifier or caveat, verify command and code examples still work as documented, and explain any unresolved factual question rather than polishing it away.
