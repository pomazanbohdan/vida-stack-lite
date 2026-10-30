---
instruction_id: run-unattended-without-asking
title: Run unattended without asking
summary: "When no human can answer during the run, never ask and never stop for input: take the default each instruction names, and report what is missing where there is none."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The review runs without a human available to answer, for example in a bot, a CI job, or another workflow."
conditions_does_not_apply_when: Someone is there to answer the questions the run raises.
artifact_contract_output_type: unattended-review-report
artifact_contract_required_data:
  - the results of the run
  - what was missing and had to be reported
artifact_contract_verified_by: "the run asked nothing, and everything a reader must act on is in the report text"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-01-gather-context.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-04-present.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/review-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run unattended without asking
If the invocation is clearly non-interactive -- it says not to ask questions, or a bot, a CI job or another workflow is running the review --
Run it without asking.
When in doubt, don't.
No human can answer during this run: never ask and never HALT for input.
Wherever an instruction below would ask, take the default it names instead; where it names none, stop and report what is missing.
The report text is the deliverable -- everything a reader must act on is in it, not only in files the run writes.
The review assumes someone is there to answer its questions.
It then asks nothing: it fixes the patch findings, and the report lists the decisions first for whoever reads it to make.
