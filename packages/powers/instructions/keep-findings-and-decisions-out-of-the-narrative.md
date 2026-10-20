---
instruction_id: keep-findings-and-decisions-out-of-the-narrative
title: Keep findings and decisions out of the narrative
summary: "The human-facing file holds the blocks and their states; the log holds findings, decisions, edits and test results."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: "A review produces two files: a human-facing narrative and a log."
conditions_does_not_apply_when: The work produces a single file that is either the narrative or the log.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the blocks and their states
  - the findings and decisions in the log
artifact_contract_verified_by: "the narrative carries no finding, decision, edit or test result"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-02-narrative.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 1
---

# Keep findings and decisions out of the narrative
Keep findings, decisions, edits, and test results out of the review narrative.
The review narrative (the human-facing file) owns review blocks and their statuses.
