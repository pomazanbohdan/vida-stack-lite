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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
---

# Research from primary sources
Spin up a **background agent** to do the research, so you keep working while it reads.
Its job:
1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
Prefer **primary sources** — filings, regulator text, official documentation, original papers, a company’s own reported numbers — over aggregators and secondary reporting.
Red flags that downgrade confidence on sight: speculative language ("could", "may", projections in future tense presented as findings), marketing register, passive voice with unnamed sources, cherry-picked or unsourced numbers, and aggregators recycling a single upstream report (that’s one publisher, however many domains echo it).
Answer engines are aggregators too, however good the synthesis: chase their citations and cite those, never the engine.
- the source policy — the preferred sources named as sources to prefer, the banned sources as sources never to cite
Conflicts resolve by recency, consistency with adjacent established facts, and publisher quality — never by averaging.
