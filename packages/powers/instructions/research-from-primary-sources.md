---
instruction_id: research-from-primary-sources
title: Research from primary sources
summary: "Investigate a question against primary sources, follow every claim back to the source that owns it, and record cited findings in one file."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A question needs facts that only the owning sources can supply.
conditions_does_not_apply_when: The answer is already known or a secondary summary suffices.
artifact_contract_output_type: cited-research
artifact_contract_required_data:
  - question
  - primary sources
  - cited findings
artifact_contract_verified_by: each claim carries its source and no claim rests on a secondary write-up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/research/SKILL.md
status: active
revision: 1
---

# Research from primary sources
Spin up a **background agent** to do the research, so you keep working while it reads.
Its job:
1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
