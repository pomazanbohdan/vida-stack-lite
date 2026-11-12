---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prfaq-agents-artifact-analyzer-md-702a12aa-c01"
title: "bmad-method: skills/bmad-prfaq/agents/artifact-analyzer.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-prfaq/agents/artifact-analyzer.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prfaq/agents/artifact-analyzer.md\"}"
atom_ids:
  - report-a-bounded-structured-payload
  - scan-a-document-set-for-what-is-relevant
atom_count: 2
atoms: "[{\"atom_id\":\"report-a-bounded-structured-payload\",\"file_sha256\":\"815d4f589285ad1a1f2d36df40f3b60753eedf3f0f432c392408725b10bf4071\",\"content_sha256\":\"6ff2a1aafaee12056671443427a91815a639b847151aad48647cae7da9bd2525\",\"file_bytes\":2845,\"body_bytes\":1429},{\"atom_id\":\"scan-a-document-set-for-what-is-relevant\",\"file_sha256\":\"c8335a87331f30ba4637e4719b52dd50eb654779690cb9cfd7b732792517207e\",\"content_sha256\":\"0379aefb1d4e183cfba81d5469a78d85420f406ec5140a036e86ed35811c32c6\",\"file_bytes\":2708,\"body_bytes\":1432}]"
carrier_sha256: 6fd16bc979a43bdb575a0d08139fb9e1f1f07b45dcfe2b8f44de98e6438f0516
carrier_bytes: 5818
revision: 1
status: active
---
<!-- vpmodule:atom:begin report-a-bounded-structured-payload -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/agents/artifact-analyzer.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/agents/web-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body defines two role-specific report payload schemas and output limits, but no judgment principle, conditional choice, ordered action sequence, or unordered checks."
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
<!-- vpmodule:atom:end report-a-bounded-structured-payload -->
<!-- vpmodule:atom:begin scan-a-document-set-for-what-is-relevant -->
---
instruction_id: scan-a-document-set-for-what-is-relevant
title: Scan a document set for what is relevant
summary: "Scan the given folders for documents that could be relevant, read the index of a sharded set first, skim the headings of a very large document before its body, read the relevant documents in parallel, and ignore the rest."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A folder of existing documents has to be mined for a known intent.
conditions_does_not_apply_when: The file to read is already known.
artifact_contract_output_type: document-scan
artifact_contract_required_data:
  - the documents found and their relevance
  - the extracted insights
  - the sections skimmed and the sections read fully
artifact_contract_verified_by: "the relevant documents are read, the irrelevant ones are not read, and the skimmed sections are named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/agents/artifact-analyzer.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - research
---

# Scan a document set for what is relevant
Scan the provided directories for documents that could be relevant:
Brainstorming reports (`*brainstorm*`, `*ideation*`)
Research documents (`*research*`, `*analysis*`, `*findings*`)
Project context (`*context*`, `*overview*`, `*background*`)
Existing briefs or summaries (`*brief*`, `*summary*`)
Any markdown, text, or structured documents that look relevant
Skip ticket files (`initiative-*.md`, `tickets/epic-*/epic-*.md`, older `SPEC*.md`): the parent reads those itself, in full.
For sharded documents (a folder with `index.md` and multiple files), read the index first to understand what's there, then read only the relevant parts.
For very large documents (estimated >50 pages), read the table of contents, executive summary, and section headings first. Read only sections directly relevant to the stated product intent. Note which sections were skimmed vs read fully.
Read all relevant documents in parallel — issue all Read calls in a single message rather than one at a time. Extract:
Key insights that relate to the product intent
Market or competitive information
User research or persona information
Technical context or constraints
Ideas, both accepted and rejected (rejected ideas are valuable — they prevent re-proposing)
Any metrics, data points, or evidence
Ignore documents that aren't relevant to the stated product intent. Don't waste tokens on unrelated content.
<!-- vpmodule:atom:end scan-a-document-set-for-what-is-relevant -->