---
instruction_id: prove-the-harness-on-one-case-before-the-set
title: Prove the harness on one case before the set
summary: "Prove the harness facts on one case before the set runs; a wrong flag, folder or login shows there."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A set of cases is about to run through an agent CLI.
conditions_does_not_apply_when: The harness was proven in this session already.
artifact_contract_output_type: harness-proof
artifact_contract_required_data:
  - the facts that were proven
  - the single case they were proven on
artifact_contract_verified_by: one case ran correctly before the set was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/harness.md
status: active
revision: 1
---

# Prove the harness on one case before the set
Prove the facts on one case before the set; a wrong flag, folder or login shows there.
When nobody is at the keyboard and nothing is recorded, stop and show the table to record.
