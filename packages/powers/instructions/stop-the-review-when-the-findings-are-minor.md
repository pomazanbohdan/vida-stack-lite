---
instruction_id: stop-the-review-when-the-findings-are-minor
title: Stop the review when the findings are minor
summary: "Stop the pass when the findings are mostly minor notes about unlikely corner cases; real findings on a third pass point outside the change, at a weak spec or unclear repo rules, and the user has to fix those."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review pass has come back with findings.
conditions_does_not_apply_when: A finding is Critical or Important.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the findings by severity
  - the stop decision
artifact_contract_verified_by: the pass stops when only minor notes about unlikely corner cases remain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/review-choices.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/validation-skills.md
status: active
revision: 1
---

# Stop the review when the findings are minor
Stop when findings are mostly minor notes about unlikely corner cases.
Real findings on a third pass point outside the change: a weak spec or unclear repo rules. Tell the user to fix that.
more than two rounds on one change usually points to a problem outside the change, such as weak planning or a messy codebase.
The depth a build ran at, skipped included, is the user's choice and no reason for another pass.
