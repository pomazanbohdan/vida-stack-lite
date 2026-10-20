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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/agents/artifact-analyzer.md
status: active
revision: 1
---

# Scan a document set for what is relevant
Scan the provided directories for documents that could be relevant:
Brainstorming reports (`*brainstorm*`, `*ideation*`)
Research documents (`*research*`, `*analysis*`, `*findings*`)
Project context (`*context*`, `*overview*`, `*background*`)
Existing briefs or summaries (`*brief*`, `*summary*`)
Any markdown, text, or structured documents that look relevant
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
