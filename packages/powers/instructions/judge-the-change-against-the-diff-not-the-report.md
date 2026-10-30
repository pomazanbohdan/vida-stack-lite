---
instruction_id: judge-the-change-against-the-diff-not-the-report
title: "Judge the change against the diff, not the report"
summary: "The whole change since the baseline is written out as a diff and read first-hand; the notes and the implementer's report are not the evidence."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The implementation is finished and has to be judged.
conditions_does_not_apply_when: Nothing was changed.
artifact_contract_output_type: diff-review
artifact_contract_required_data:
  - the baseline revision
  - the diff of every change since it
  - the reading of that diff
artifact_contract_verified_by: the judgement was made against the diff of everything that changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Judge the change against the diff, not the report
Stage the diff and read it: using the repository's version-control tooling
read that file into your own context
Judge against the diff, not just implementation notes or a subagent's report.
