---
instruction_id: write-tight-glossary-entries
title: Write tight glossary entries
summary: "Write glossary entries that are opinionated, one or two sentences, and only for terms specific to the project's context."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: A project glossary is created or a term is added to it.
conditions_does_not_apply_when: The term is a general programming concept the project merely uses.
artifact_contract_output_type: glossary-entry
artifact_contract_required_data:
  - term
  - one-two-sentence definition
  - avoid list
artifact_contract_verified_by: "every entry defines what the term is, not what it does, and names its avoided synonyms"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/domain-modeling/GLOSSARY-FORMAT.md
status: active
revision: 1
---

# Write tight glossary entries
- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.
