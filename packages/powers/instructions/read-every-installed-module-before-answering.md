---
instruction_id: read-every-installed-module-before-answering
title: Read every installed module before answering
summary: "Another module may change the answer, so the question is answered against all the installed help, not only the one it seems to concern."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: Several modules are installed and the question seems to belong to one of them.
conditions_does_not_apply_when: Only one module is installed.
artifact_contract_output_type: module-scan
artifact_contract_required_data:
  - the modules read
  - the answer and the module it comes from
artifact_contract_verified_by: every installed module was read before the answer was given
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad/references/help.md
status: active
revision: 1
---

# Read every installed module before answering
The output of `knowledge.py` is your source for every answer. Its `documents` hold the help of each installed module: what its skills are for, how they fit together, and what comes next. Follow every module's document, not only the one the question seems to concern, since another module may change the answer.

A match shows a skill ran, not that its work is finished; ask when it matters.
