---
instruction_id: report-a-bounded-structured-payload
title: Report a bounded structured payload
summary: "Return only the fixed JSON object: no preamble, no commentary, a bounded length, and at most five bullets per section, prioritising the most impactful findings."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A scanner or a researcher returns its result to the parent.
conditions_does_not_apply_when: The result is prose written for a person to read.
artifact_contract_output_type: structured-payload
artifact_contract_required_data:
  - the JSON object
  - the section list
  - the bullet count per section
artifact_contract_verified_by: the response is only the JSON object and no section carries more than five bullets
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/agents/artifact-analyzer.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/agents/web-researcher.md
status: active
revision: 1
---

# Report a bounded structured payload
Return ONLY the following JSON object. No preamble, no commentary.
## Artifact analyzer
Keep total response under 1,500 tokens.
Maximum 5 bullets per section — prioritize the most impactful findings.
```json
{
  "documents_found": [
    {"path": "file path", "relevance": "one-line summary"}
  ],
  "key_insights": [
    "bullet — grouped by theme, each self-contained"
  ],
  "user_market_context": [
    "bullet — users, market, competition found in docs"
  ],
  "technical_context": [
    "bullet — platforms, constraints, integrations"
  ],
  "ideas_and_decisions": [
    {"idea": "description", "status": "accepted|rejected|open", "rationale": "brief why"}
  ],
  "raw_detail_worth_preserving": [
    "bullet — specific details, data points, quotes for the distillate"
  ]
}
```
## Web researcher
Keep total response under 1,000 tokens.
Maximum 5 bullets per section.
```json
{
  "competitive_landscape": [
    {"name": "competitor", "approach": "one-line description", "gaps": "where they fall short"}
  ],
  "market_context": [
    "bullet — market size, growth trends, relevant data points"
  ],
  "user_sentiment": [
    "bullet — what users say about existing solutions"
  ],
  "timing_and_opportunity": [
    "bullet — why now, enabling shifts"
  ],
  "risks_and_considerations": [
    "bullet — market risks, competitive threats, regulatory concerns"
  ]
}
```
