---
instruction_id: calibrate-the-editorial-findings-to-the-reader-type
title: Calibrate the editorial findings to the reader type
summary: "Every editorial finding is calibrated to the reader it serves: a human reader gets flow, warmth and reinforcement preserved; a model reader gets precision, explicit terms and no hedging."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass produces findings for a document with a known or inferable reader.
conditions_does_not_apply_when: The reader is already fixed and the findings were calibrated to it.
artifact_contract_output_type: reader-calibrated-findings
artifact_contract_required_data:
  - the reader type
  - the findings calibrated to it
artifact_contract_verified_by: "every finding matches the reader type, and no element that serves that reader is cut without a flag"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 1
---

# Calibrate the editorial findings to the reader type
Calibrate every finding to the reader type — stated in the request,
else the configured one.
**humans** (default) — optimize for clarity, flow, and natural progression. These elements serve comprehension and engagement; preserve them unless clearly wasteful, and flag any recommendation that would cut one:
- Visual aids: diagrams, images, and flowcharts anchor understanding
- Expectation-setting: "What You'll Learn" helps readers confirm they're in the right place
- Reader's journey: organize content as a linear progression, not a database
- Mental models: overview before details prevents cognitive overload
- Warmth: encouraging tone reduces anxiety for new users
- Whitespace: admonitions and callouts provide visual breathing room
- Summaries: recaps help retention; they're reinforcement, not redundancy
- Examples: concrete illustrations make abstract concepts accessible
- Engagement: flow techniques (transitions, variety) are functional, not fluff — they maintain attention
**llm** — optimize for precision and unambiguity. An LLM-targeted document may run longer where explicitness pays and shorter where warmth was cut:
- Dependency-first: define concepts before usage to minimize hallucination risk
- Cut emotional language, encouragement, and orientation sections
- Reference well-known standards ("conventional commits", "REST APIs") instead of re-teaching them; be explicit where a concept is not well-known — and either way, ground the expectation with an example
- Consistent terminology: same word for same concept throughout
- No hedging ("might", "could", "generally") — direct statements
- Prefer structured formats (tables, lists, YAML) over prose
- Unambiguous references: no unclear antecedents ("it", "this", "the above")
