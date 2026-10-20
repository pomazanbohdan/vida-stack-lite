---
instruction_id: open-with-the-one-sentence-read-of-purpose-and-audience
title: Open with the one-sentence read of purpose and audience
summary: "The output opens with one sentence naming who the document is for and what it is for, so the author can correct a wrong premise before acting on the findings."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass starts and the purpose or the audience is not given.
conditions_does_not_apply_when: The request states the purpose and the audience outright.
artifact_contract_output_type: purpose-read
artifact_contract_required_data:
  - the audience
  - the goal
  - where the read came from
artifact_contract_verified_by: the output opens with the one-sentence read and it names the audience and the goal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 1
---

# Open with the one-sentence read of purpose and audience
Infer purpose and audience from the content and standing context when not provided, and open the output with your one-sentence read — "this document exists to help [audience] accomplish [goal]" — so the author can correct a wrong premise before acting on the findings.
