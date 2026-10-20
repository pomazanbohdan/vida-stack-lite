---
instruction_id: write-a-research-prompt-for-another-tool
title: Write a research prompt for another tool
summary: "Hand the type's questions, the recency rules and the citation demand to the research tool the reader already pays for, and process the report that comes back."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The reader already has a deep-research tool and the research has to run there.
conditions_does_not_apply_when: The research has to run in this session or reach internal sources.
artifact_contract_output_type: research-prompt
artifact_contract_required_data:
  - "the type's questions"
  - the recency rules
  - the citation demand
artifact_contract_verified_by: "the prompt carries the type's questions, the recency rules and the citation demand"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/research-a-decision.md
status: active
revision: 1
---

# Write a research prompt for another tool
The prompt carries the type's questions, recency rules, and a citation demand, tuned to the tool you name.
Point it at any finished report (the one your tool just produced, an analyst PDF, a colleague's document).
Draft exists because most people already pay for a deep-research tool, and those products crawl widely.
