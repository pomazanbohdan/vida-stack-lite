---
instruction_id: answer-in-chat-when-one-file-is-enough
title: Answer in chat when one file is enough
summary: "An ask that one file answers is answered in chat with citations, and a document is produced only when the asker still wants it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The whole ask can be answered from a single file.
conditions_does_not_apply_when: The ask spans many parts of the repository.
artifact_contract_output_type: chat-answer
artifact_contract_required_data:
  - the answer
  - its citation
  - the decision on producing a document
artifact_contract_verified_by: the answer was given in chat with a citation before any document was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Answer in chat when one file is enough
- An ask one file answers gets its answer in chat, cited, and a run only if the user still wants the document; headless, run as asked.
