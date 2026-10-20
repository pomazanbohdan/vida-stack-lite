---
instruction_id: answer-one-question-per-section-with-inline-citations
title: Answer one question per section with inline citations
summary: "One section per question, in order: the answer in prose with each claim cited inline, call stacks and file trees as indented lists with each entry a citation, and what was looked for and not found."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A question of the approved set is being answered.
conditions_does_not_apply_when: The answer is a decision or a plan rather than a finding about the code.
artifact_contract_output_type: research-answer
artifact_contract_required_data:
  - the answer in prose
  - the inline citation of each claim
  - the cited call stack or file tree
  - what was looked for and not found
artifact_contract_verified_by: each section answers one question and each claim in it carries a citation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 1
---

# Answer one question per section with inline citations
one `## <n>. <question>` section per question, in order
the answer in prose with each claim cited inline
call stacks and file trees as indented lists, each entry a citation
and what was looked for and not found
