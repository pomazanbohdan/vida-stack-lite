---
instruction_id: output-only-the-requested-reference
title: Output only the requested reference
summary: "A help request answers with the content of the one matching reference and nothing else — no project analysis, no status, no next steps, no commentary."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The user asks for the help of a command or a topic.
conditions_does_not_apply_when: The user asks a question that the reference does not answer.
artifact_contract_output_type: reference-content
artifact_contract_required_data:
  - the reference that matched the request
  - its content
artifact_contract_verified_by: "the answer is the reference content and carries no addition, no project context and no suggestion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body governs verbatim display of any reference but identifies no supported subject domain.
---

# Output only the requested reference
Output ONLY the reference content of the chosen mode. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
Read only the one mode file that matches `$ARGUMENTS`, then output its `<reference>` body verbatim.
After loading the chosen mode, emit its `<reference>` block content directly. No additions, no project context, no suggestions.
