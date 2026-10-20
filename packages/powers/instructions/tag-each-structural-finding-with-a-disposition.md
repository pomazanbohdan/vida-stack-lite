---
instruction_id: tag-each-structural-finding-with-a-disposition
title: Tag each structural finding with a disposition
summary: "Every structural finding carries one of six dispositions and its word impact, and a length target is checked against the recommendations."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The structural pass writes up what it found.
conditions_does_not_apply_when: The prose pass writes up what it found.
artifact_contract_output_type: structural-findings
artifact_contract_required_data:
  - what does not serve the purpose
  - the disposition of each finding
  - the word impact of each finding
  - whether the length target is met
artifact_contract_verified_by: "every finding carries one disposition and its word impact, and the length target is answered"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-structure.md
status: active
revision: 1
---

# Tag each structural finding with a disposition
Hunt for: sections that don't serve the stated purpose, true redundancy (identical information with no reinforcement value), scope violations (content that belongs in a different document), buried critical information, premature detail, missing scaffolding, and the classic anti-patterns — FAQs that should be inline, appendices that should be cut, overviews that repeat the body verbatim.
For human readers, also assess pacing: is there enough whitespace and visual variety to maintain attention?
Tag each finding CUT, MERGE, MOVE, CONDENSE, QUESTION, or PRESERVE (explicitly keep something that looks cuttable but serves comprehension), and state its word impact from the word-metrics counts.
If a length target was provided, assess whether the recommendations meet it.
