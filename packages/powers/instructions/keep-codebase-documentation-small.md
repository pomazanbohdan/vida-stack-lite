---
instruction_id: keep-codebase-documentation-small
title: Keep codebase documentation small
summary: "The code is the best documentation for an agent: documents hold only what the code cannot explain, heavy documentation goes stale quickly, and the rules file points at the decision records instead of copying them."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: "A codebase's documentation is written, refreshed or cut."
conditions_does_not_apply_when: The document records a decision rather than describing the code.
artifact_contract_output_type: documentation-set
artifact_contract_required_data:
  - what the code cannot explain
  - the documents that stay
artifact_contract_verified_by: each remaining document holds something the code cannot say
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 1
---

# Keep codebase documentation small
The code is the best documentation for an agent.
During coding, an agent should need few documents.
Documents should hold only what the code cannot explain: why a decision was made, a constraint from outside the code, a rule that spans components.
guidance produced heavy documentation of a codebase. That is no longer suggested.
Those documents were bloated, hard to maintain, and went stale quickly.
Recommend decision records (ADRs), one per decision, only for what is needed
`AGENTS.md` should make agents aware the records exist and when to consult them, without copying their content.
