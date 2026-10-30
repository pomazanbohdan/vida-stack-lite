---
instruction_id: scale-the-read-depth-to-the-context-window
title: Scale the read depth to the context window
summary: "How much of a document is read depends on the size of the context window: summaries first, full bodies only when they are needed and there is room."
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Artifacts are read in a session whose context window is known.
conditions_does_not_apply_when: The artifact is known to be short.
artifact_contract_output_type: read-depth-plan
artifact_contract_required_data:
  - the context window
  - the read depth chosen
  - the parts that were not read
artifact_contract_verified_by: the read depth matches the context window and the skipped parts are named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/context-budget.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Scale the read depth to the context window
Read depth scales with context window
read only frontmatter, status fields, or summaries.
MAY read full subagent output bodies when the content is needed for inline presentation or decision-making. Still avoid unnecessary reads.
If the field is absent, treat as 200k (conservative default).
Never read agent definition files
Never inline large files into subagent prompts -- tell agents to read files from disk instead
At < 500000: read only frontmatter, status fields, or summaries. At >= 500000 (1M model): full body reads permitted when content is needed for inline decisions
read frontmatter only from prior phase SUMMARYs. At >= 500000: full body reads permitted for direct-dependency phases. Transitive dependencies (2+ phases back) remain frontmatter-only regardless
Never read full PLAN.md files from other phases -- only current phase plans
Do not re-read full file contents when frontmatter is sufficient -- frontmatter contains status, key_files, commits, and provides fields
