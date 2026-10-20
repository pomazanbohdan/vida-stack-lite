---
instruction_id: extract-the-sources-instead-of-ingesting-them
title: Extract the sources instead of ingesting them
summary: Send the source documents to subagents for extraction against the owner’s stated focus and assemble the document from the extracts.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The run has source documents that have to be read.
conditions_does_not_apply_when: No subagent is available to do the extraction.
artifact_contract_output_type: source-extracts
artifact_contract_required_data:
  - the extracts
  - the focus each extraction ran against
artifact_contract_verified_by: no source document was loaded wholesale into the working context
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 1
---

# Extract the sources instead of ingesting them
Extract, don't ingest. Source documents go to subagents for extraction; the parent assembles from extracts.
Only load source documents into the parent context wholesale when no subagents are available.
Source artifacts (provided by the user or discovered during the run — transcripts, brainstorms, research reports, code, web results, prior briefs) enter the parent conversation as relevance-filtered extracts, not loaded wholesale.
Subagents do the extraction against the user's stated focus; the parent context stays lean.
Research subagents (default). During Discovery, spawn web-research subagents to ground the picture: what exists in the space, how comparables position themselves, current landscape. Subagent does the search; parent receives a digest.
