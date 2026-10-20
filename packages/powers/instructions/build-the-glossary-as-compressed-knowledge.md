---
instruction_id: build-the-glossary-as-compressed-knowledge
title: Build the glossary as compressed knowledge
summary: "Add a glossary term only when the learner understands it, define what it is in one or two sentences, and use its own terms inside definitions."
capability_tags:
  - teach-with-workspace
pattern_tags:
  - teaching-workspace
conditions_applies_when: A teaching workspace needs shared terminology.
conditions_does_not_apply_when: The learner has only just met the concept.
artifact_contract_output_type: teaching-glossary
artifact_contract_required_data:
  - terms
  - tight definitions
  - avoided synonyms
artifact_contract_verified_by: every term is usable correctly by the learner and defined by what it is
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/teach/GLOSSARY-FORMAT.md
status: active
revision: 1
---

# Build the glossary as compressed knowledge
The glossary is the canonical language for this teaching workspace. All explainers, exercises, and learning records should adhere to its terminology. Building it is itself part of learning: compressing a concept into a tight definition is evidence the user understands it.
- **Add a term only when the user understands it.** The glossary is a record of compressed knowledge, not a dictionary the user reads to learn. If the user has just been introduced to a concept, wait until they can use it correctly before promoting it here.
- **Be opinionated.** When several words exist for the same concept, pick the best one and list the rest as aliases to avoid. This is how language compresses.
- **Keep definitions tight.** One or two sentences. Define what the term IS, not what it does or how to do it.
- **Use the glossary's own terms inside definitions.** Once a term is in the glossary, prefer it everywhere, including inside other definitions. This is what makes complex terms easier to grasp later.
- **Group under subheadings** when natural clusters emerge. A flat list is fine when terms cohere.
- **Flag ambiguities explicitly.** If a term is used loosely in the wider field, note the resolution: "In this workspace, 'set' always means a working set; warm-ups are tracked separately."
- **Revise as understanding deepens.** A definition the user wrote in week one may be wrong by week six. Update in place; do not leave stale entries.
